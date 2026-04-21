import {ref, computed, watch, onUnmounted} from 'vue'
import {api} from '../api/client.js'
import {useTradingStore} from '../stores/trading.js'
import {useBinancePrice} from './useBinancePrice.js'

let _uid = 0

function nextId() {
    return `mmt-${Date.now()}-${(++_uid).toString(36)}`
}

function randomBetween(min, max) {
    return min + Math.random() * (max - min)
}

export function useMMT() {
    const store = useTradingStore()
    const binance = useBinancePrice()

    const isRunning = ref(false)
    const speed = ref(1)          // orders per second
    const spreadPct = ref(0.3)    // % spread half-width
    const batchSize = ref(2)      // orders per tick
    const autoCancel = ref(true)  // auto-cancel old orders
    const cancelAfterMs = ref(20000) // cancel orders older than N ms
    const aggressionPct = ref(20) // 0 = fully passive, 100 = all at inner edge
    const maxPerSide = 20         // cap resting orders per side; older get cancelled

    // Mid is driven directly by the live Binance price. The OME book mid is
    // only a fallback when Binance is disconnected — otherwise every batch
    // re-reads the latest Binance tick, so orders track the external market.
    const effectiveMid = computed(() => {
        if (binance.price.value > 0) return binance.price.value
        const liveMid = parseFloat(store.midPrice)
        return liveMid > 0 ? liveMid : 0
    })

    let tickInterval = null
    let cancelInterval = null

    // ~40% of orders are aggressive (cross the spread) to guarantee matches.
    // Passive orders rest inside the book; aggressive orders sweep against
    // the opposite side and match immediately.
    function generateOrder(side) {
        const mid = effectiveMid.value
        if (!(mid > 0)) return null
        const halfSpread = mid * (spreadPct.value / 100) / 2
        const aggressive = Math.random() * 100 < aggressionPct.value

        let price
        if (aggressive) {
            // Cross into the opposite side → will match resting orders
            const cross = mid * randomBetween(0, 0.008)
            price = side === 'buy'
                ? (mid + halfSpread + cross).toFixed(2)   // above ask → matches sells
                : (mid - halfSpread - cross).toFixed(2)   // below bid → matches buys
        } else {
            // Passive: rest inside the book, add liquidity
            const noise = mid * randomBetween(0, 0.01)
            price = side === 'buy'
                ? (mid - halfSpread - noise).toFixed(2)
                : (mid + halfSpread + noise).toFixed(2)
        }

        const quantity = randomBetween(0.001, 0.15).toFixed(4)
        return {
            id: nextId(),
            userId: Math.floor(randomBetween(1, 1_000_000)),
            side,
            price,
            quantity,
            aggressive,
        }
    }

    // Apply an OME placement response to our local state. Returns
    // { filled, rested } in the same units as order.quantity.
    //
    // OME response semantics:
    //   • completed === [] && partial === null → order rested fully, no match
    //   • order_id in completed → that order is fully done (removed from book);
    //     completed[i].quantity is the matched size for that order
    //   • partial.order_id present → that order was partially matched;
    //     partial.quantity is the MATCHED amount for that fill
    function applyPlaceResponse(order, resp) {
        store.stats.placed++

        const completedList = resp?.completed ?? []
        const partial = resp?.partial ?? null

        // Anything in `completed` is fully done — drop each from the active
        // list. Covers our own id (if our order filled fully) and any resting
        // maker orders we consumed that were still tracked here.
        for (const m of completedList) {
            store.removeActiveOrder(m.order_id)
        }

        const placedQty = parseFloat(order.quantity)
        const myCompleted = completedList.find(m => m.order_id === order.id)
        const myPartial = partial && partial.order_id === order.id ? partial : null

        let filledQty = 0
        let restedQty = placedQty

        if (myCompleted) {
            filledQty = parseFloat(myCompleted.quantity)
            restedQty = placedQty - filledQty
        } else if (myPartial) {
            filledQty = parseFloat(myPartial.quantity)
            restedQty = placedQty - filledQty
        }

        // Only record the taker side (our order) in Live Trades. Every trade
        // has a maker + a taker on the same print; showing both double-counts.
        if (filledQty > 1e-8) {
            store.addMatched([{
                order_id: order.id,
                side: order.side,
                price: order.price,
                quantity: filledQty.toFixed(4),
                matched_at: Date.now(),
            }])
        }

        if (restedQty > 1e-8) {
            store.addActiveOrder({...order, quantity: restedQty.toFixed(4)})
        }

        return {filled: filledQty, rested: restedQty}
    }

    async function placeSingle(order) {
        let resp
        try {
            resp = await api.placeLimitOrder({
                order_id: order.id,
                user_id: order.userId,
                side: order.side,
                quantity: order.quantity,
                price: order.price,
            })
        } catch {
            return // MMT loop swallows errors so one rejection doesn't kill the batch
        }

        const {rested} = applyPlaceResponse(order, resp)

        if (order.aggressive && rested > 1e-8) {
            // Aggressive remainder would rest on the wrong side of mid
            // (inverted quote). Cancel it and wait for OME success before
            // untracking — so it never lingers in the book silently.
            await store.cancelActiveOrder(order.id)
        }
    }

    async function tick() {
        const half = Math.max(1, Math.floor(batchSize.value / 2))
        const buys = Array.from({length: half}, () => generateOrder('buy'))
        const sells = Array.from({length: batchSize.value - half}, () => generateOrder('sell'))
        const all = [...buys, ...sells].filter(Boolean)
        if (!all.length) return

        // Fire all concurrently
        await Promise.allSettled(all.map(placeSingle))
        await trimSides()
    }

    // Keep at most `maxPerSide` resting orders per side. activeOrders is
    // newest-first (unshift), so .slice(maxPerSide) picks up the oldest tail
    // on that side for cancellation.
    async function trimSides() {
        const buys = store.activeOrders.filter(o => o.side === 'buy')
        const sells = store.activeOrders.filter(o => o.side === 'sell')
        const excess = [...buys.slice(maxPerSide), ...sells.slice(maxPerSide)]
        if (!excess.length) return
        await Promise.allSettled(excess.map(o => store.cancelActiveOrder(o.id)))
    }

    async function cancelOld() {
        if (!autoCancel.value) return
        const cutoff = Date.now() - cancelAfterMs.value
        const toCancel = store.activeOrders
            .filter(o => o.placedAt < cutoff)
            .map(o => o.id)
        await Promise.allSettled(toCancel.map(id => store.cancelActiveOrder(id)))
    }

    function applySpeed() {
        if (tickInterval) {
            clearInterval(tickInterval);
            tickInterval = null
        }
        const interval = Math.max(50, Math.round(1000 / speed.value))
        tickInterval = setInterval(tick, interval)
    }

    function start() {
        if (isRunning.value) return
        isRunning.value = true
        applySpeed()
        cancelInterval = setInterval(cancelOld, 3000)
    }

    watch(speed, () => {
        if (isRunning.value) applySpeed()
    })

    async function stop() {
        isRunning.value = false
        if (tickInterval) {
            clearInterval(tickInterval);
            tickInterval = null
        }
        if (cancelInterval) {
            clearInterval(cancelInterval);
            cancelInterval = null
        }

        // Cancel every tracked order (awaits OME success) then wipe the book
        await store.cancelAllActive()
        try {
            await api.resetOrderBook()
            await api.startOrderBook()
        } catch { /* ignore */
        }
    }

    async function flood(count = 100) {
        const half = Math.floor(count / 2)
        const orders = [
            ...Array.from({length: half}, () => generateOrder('buy')),
            ...Array.from({length: count - half}, () => generateOrder('sell')),
        ].filter(Boolean)
        if (!orders.length) return
        await Promise.allSettled(orders.map(placeSingle))
        await trimSides()
    }

    async function cancelAll() {
        await store.cancelAllActive()
    }

    // Manual order placement — same bookkeeping as MMT ticks (stats, active
    // orders, match recording) but errors propagate so the UI can surface
    // the OME rejection instead of silently succeeding.
    async function placeManual({side, price, quantity}) {
        const order = {
            id: nextId(),
            userId: Math.floor(randomBetween(1, 1_000_000)),
            side,
            price: String(price),
            quantity: String(quantity),
            aggressive: false,
        }
        const resp = await api.placeLimitOrder({
            order_id: order.id,
            user_id: order.userId,
            side: order.side,
            quantity: order.quantity,
            price: order.price,
        })
        const {filled, rested} = applyPlaceResponse(order, resp)
        return {id: order.id, filled, rested}
    }

    async function resetAll() {
        await stop()
        store.clearActiveOrders()
        store.resetStats()
        try {
            await api.resetOrderBook()
            await api.startOrderBook()
        } catch { /* ignore */
        }
    }

    onUnmounted(() => {
        stop()
    })

    return {
        isRunning,
        speed,
        spreadPct,
        batchSize,
        autoCancel,
        cancelAfterMs,
        aggressionPct,
        effectiveMid,
        binance,
        start,
        stop,
        flood,
        cancelAll,
        resetAll,
        placeManual,
    }
}