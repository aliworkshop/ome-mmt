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
    const userMidPrice = ref(50000)
    const spreadPct = ref(0.3)    // % spread half-width
    const batchSize = ref(2)      // orders per tick
    const autoCancel = ref(true)  // auto-cancel old orders
    const cancelAfterMs = ref(20000) // cancel orders older than N ms
    const aggressionPct = ref(20) // 0 = fully passive (no matches), 100 = all aggressive

    // Keep userMidPrice in sync with Binance live price
    watch(binance.price, (p) => {
        if (p > 0) userMidPrice.value = p
    })

    // Always anchor new orders to the Binance reference price so the book
    // tracks the external market. Fall back to the OME book mid only if
    // Binance is disconnected.
    const effectiveMid = computed(() => {
        if (userMidPrice.value > 0) return userMidPrice.value
        const liveMid = parseFloat(store.midPrice)
        return liveMid > 0 ? liveMid : 0
    })

    // Track orders placed by MMT: orderId -> {side, price, qty, placedAt}
    const mmtOrders = new Map()

    let tickInterval = null
    let cancelInterval = null

    // ~40% of orders are aggressive (cross the spread) to guarantee matches.
    // Passive orders rest inside the book; aggressive orders sweep against
    // the opposite side and match immediately.
    function generateOrder(side) {
        const mid = effectiveMid.value
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

    async function placeSingle(order) {
        try {
            const resp = await api.placeLimitOrder({
                order_id: order.id,
                user_id: order.userId,
                side: order.side,
                quantity: order.quantity,
                price: order.price,
            })
            mmtOrders.set(order.id, {...order, placedAt: Date.now()})
            store.addActiveOrder(order)

            // Build one taker entry from the placed order's perspective
            const filledQty = (resp.completed ?? []).reduce((s, m) => s + parseFloat(m.quantity || 0), 0)
                + parseFloat(resp.partial?.quantity || 0)
            if (filledQty > 0) {
                store.addMatched([{
                    order_id: order.id,
                    side: order.side,
                    price: order.price,
                    quantity: filledQty.toFixed(4),
                    matched_at: Date.now(),
                }])
            }

            // Remove from active if fully matched
            const fullyFilled = resp.left === '0' || resp.left === ''
            if (fullyFilled) {
                mmtOrders.delete(order.id)
                store.removeActiveOrder(order.id)
            } else if (order.aggressive) {
                // Aggressive orders cross the spread to take liquidity. Any
                // unfilled remainder would rest on the wrong side of mid
                // (inverted quote), so cancel it immediately.
                try {
                    await api.cancelOrder(order.id)
                } catch { /* already gone */
                }
                mmtOrders.delete(order.id)
                store.removeActiveOrder(order.id)
            }
        } catch {
            // order rejected or network error — ignore
        }
    }

    async function tick() {
        const half = Math.max(1, Math.floor(batchSize.value / 2))
        const buys = Array.from({length: half}, () => generateOrder('buy'))
        const sells = Array.from({length: batchSize.value - half}, () => generateOrder('sell'))
        const all = [...buys, ...sells]

        // Fire all concurrently
        await Promise.allSettled(all.map(placeSingle))
    }

    async function cancelOld() {
        if (!autoCancel.value) return
        const cutoff = Date.now() - cancelAfterMs.value
        const mid = effectiveMid.value
        const toCancel = []
        for (const [id, o] of mmtOrders.entries()) {
            if (o.placedAt < cutoff) {
                toCancel.push(id)
                continue
            }
            // Sweep inverted quotes: a buy resting above mid or a sell
            // resting below mid means the reference price has drifted past
            // the order. Cancel so it does not cross the book the wrong way.
            if (mid > 0) {
                const p = parseFloat(o.price)
                if (o.side === 'buy' && p > mid) toCancel.push(id)
                else if (o.side === 'sell' && p < mid) toCancel.push(id)
            }
        }
        await Promise.allSettled(
            toCancel.map(async (id) => {
                try {
                    await api.cancelOrder(id)
                    mmtOrders.delete(id)
                    store.removeActiveOrder(id)
                } catch {
                    // already matched or gone
                    mmtOrders.delete(id)
                    store.removeActiveOrder(id)
                }
            })
        )
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

        // Cancel every tracked order then wipe the book
        const ids = [...mmtOrders.keys()]
        await Promise.allSettled(
            ids.map(async (id) => {
                try {
                    await api.cancelOrder(id)
                } catch { /* already matched or gone */
                }
                mmtOrders.delete(id)
                store.removeActiveOrder(id)
            })
        )
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
        ]
        await Promise.allSettled(orders.map(placeSingle))
    }

    async function cancelAll() {
        const ids = [...mmtOrders.keys()]
        await Promise.allSettled(
            ids.map(async (id) => {
                try {
                    await api.cancelOrder(id)
                } catch { /* ignore */
                }
                mmtOrders.delete(id)
                store.removeActiveOrder(id)
            })
        )
    }

    async function resetAll() {
        stop()
        mmtOrders.clear()
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
        userMidPrice,
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
    }
}