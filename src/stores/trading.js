import {defineStore} from 'pinia'
import {ref, reactive, computed} from 'vue'
import {api} from '../api/client.js'

export const useTradingStore = defineStore('trading', () => {
    // ─── Connection ─────────────────────────────────────────────────────────────
    const connected = ref(false)
    let eventSource = null

    // ─── Order Book ─────────────────────────────────────────────────────────────
    const rawAsks = ref({})
    const rawBids = ref({})

    const asks = computed(() =>
        Object.entries(rawAsks.value)
            .map(([price, side]) => ({price: parseFloat(price), volume: parseFloat(side.volume ?? side.Volume ?? 0)}))
            .sort((a, b) => a.price - b.price)
            .slice(0, 20)
    )

    const bids = computed(() =>
        Object.entries(rawBids.value)
            .map(([price, side]) => ({price: parseFloat(price), volume: parseFloat(side.volume ?? side.Volume ?? 0)}))
            .sort((a, b) => b.price - a.price)
            .slice(0, 20)
    )

    const spread = computed(() => {
        const bestAsk = asks.value[0]?.price ?? 0
        const bestBid = bids.value[0]?.price ?? 0
        if (!bestAsk || !bestBid) return '—'
        return (bestAsk - bestBid).toFixed(2)
    })

    const midPrice = computed(() => {
        const bestAsk = asks.value[0]?.price ?? 0
        const bestBid = bids.value[0]?.price ?? 0
        if (!bestAsk || !bestBid) return 0
        return ((bestAsk + bestBid) / 2).toFixed(2)
    })

    // ─── Active Orders ───────────────────────────────────────────────────────────
    const activeOrders = ref([])
    const activeOrderIds = new Set()

    function addActiveOrder(order) {
        if (activeOrderIds.has(order.id)) return
        activeOrderIds.add(order.id)
        activeOrders.value.unshift({
            id: order.id,
            side: order.side,
            price: order.price,
            quantity: order.quantity,
            placedAt: Date.now(),
            new: true,
        })
        if (activeOrders.value.length > 300) {
            const removed = activeOrders.value.splice(250)
            removed.forEach(o => activeOrderIds.delete(o.id))
        }
        setTimeout(() => {
            const o = activeOrders.value.find(x => x.id === order.id)
            if (o) o.new = false
        }, 800)
    }

    function removeActiveOrder(id) {
        const idx = activeOrders.value.findIndex(o => o.id === id)
        if (idx !== -1) {
            activeOrders.value.splice(idx, 1)
            activeOrderIds.delete(id)
        }
    }

    function clearActiveOrders() {
        activeOrders.value = []
        activeOrderIds.clear()
    }

    // Pull the embedded JSON payload out of an OME gRPC error message like:
    //   rpc error: code = InvalidArgument desc = {"message":"...","code":903}
    // Returns the parsed object, or null if it doesn't look like one.
    function parseOmeError(err) {
        const msg = err?.message ?? ''
        const start = msg.indexOf('{')
        if (start === -1) return null
        try {
            return JSON.parse(msg.slice(start))
        } catch {
            return null
        }
    }

    // Cancel an order on the OME and only remove it from local tracking once
    // the cancel has succeeded. On failure the order stays in the list so the
    // UI continues to reflect what is actually resting on the book.
    //
    // OME code 903 ("order does not exist") means the order was already gone
    // on their side (cancelled earlier, or filled between our snapshot and
    // the cancel request). Ignore the error and drop it from the map.
    async function cancelActiveOrder(id) {
        try {
            await api.cancelOrder(id)
        } catch (e) {
            if (parseOmeError(e)?.code === 903) {
                removeActiveOrder(id)
                return true
            }
            return false
        }
        removeActiveOrder(id)
        stats.cancelled++
        return true
    }

    async function cancelAllActive() {
        const ids = activeOrders.value.map(o => o.id)
        await Promise.allSettled(ids.map(cancelActiveOrder))
    }

    // ─── Matched Orders ──────────────────────────────────────────────────────────
    const matchedOrders = ref([])
    const newMatchIds = new Set()
    let _seq = 0  // monotonic insert counter — tiebreaker for same-ms matches

    function addMatched(matches) {
        for (const m of matches) {
            if (!m || !m.order_id) continue
            stats.matched++
            const qty = parseFloat(m.quantity || 0)
            const price = parseFloat(m.price || 0)
            stats.volume += qty * price
            const entry = {
                id: m.order_id,
                side: m.side,
                price: m.price,
                quantity: m.quantity,
                timestamp: m.timestamp || new Date().toISOString(),
                matched_at: m.matched_at || Date.now(),
                seq: ++_seq,
                new: true,
            }
            matchedOrders.value.unshift(entry)
            newMatchIds.add(m.order_id)
            setTimeout(() => {
                const o = matchedOrders.value.find(x => x.id === m.order_id)
                if (o) o.new = false
                newMatchIds.delete(m.order_id)
            }, 1200)
        }
        if (matchedOrders.value.length > 2000) {
            matchedOrders.value = matchedOrders.value.slice(0, 2000)
        }
    }

    // ─── Stats ───────────────────────────────────────────────────────────────────
    const stats = reactive({
        placed: 0,
        cancelled: 0,
        matched: 0,
        volume: 0,
    })

    function resetStats() {
        stats.placed = 0
        stats.cancelled = 0
        stats.matched = 0
        stats.volume = 0
    }

    // ─── SSE Connection ──────────────────────────────────────────────────────────
    function connectSSE() {
        if (eventSource) eventSource.close()
        eventSource = new EventSource('/api/stream')

        eventSource.addEventListener('connected', () => {
            connected.value = true
        })

        eventSource.addEventListener('update', (e) => {
            try {
                const data = JSON.parse(e.data)
                if (data.orderbook) {
                    rawAsks.value = data.orderbook.asks ?? {}
                    rawBids.value = data.orderbook.bids ?? {}
                }
                // Taker trades are pushed directly from placeSingle — skip SSE maker fills
            } catch {
                // ignore parse errors
            }
        })

        eventSource.onerror = () => {
            connected.value = false
            setTimeout(connectSSE, 3000)
        }
    }

    function disconnectSSE() {
        if (eventSource) {
            eventSource.close()
            eventSource = null
        }
        connected.value = false
    }

    return {
        connected,
        rawAsks, rawBids, asks, bids, spread, midPrice,
        activeOrders, addActiveOrder, removeActiveOrder, clearActiveOrders,
        cancelActiveOrder, cancelAllActive,
        matchedOrders, addMatched,
        stats, resetStats,
        connectSSE, disconnectSSE,
    }
})