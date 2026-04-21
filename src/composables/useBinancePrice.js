import {ref, onUnmounted} from 'vue'

const WS_URL = 'wss://stream.binance.com:9443/ws/btcusdt@miniTicker'
const RECONNECT_DELAY = 3000
const HISTORY_LIMIT = 240

const price = ref(0)
const connected = ref(false)
const change24h = ref(0)
const history = ref([])

let ws = null
let reconnectTimer = null
let refCount = 0
let starting = false

function connect() {
    if (ws || starting) return
    starting = true
    ws = new WebSocket(WS_URL)

    ws.onopen = () => {
        starting = false
        connected.value = true
    }

    ws.onmessage = (e) => {
        try {
            const d = JSON.parse(e.data)
            const cur = parseFloat(d.c)
            const open = parseFloat(d.o)
            if (cur > 0) {
                price.value = cur
                change24h.value = open > 0 ? ((cur - open) / open) * 100 : 0
                history.value.push({t: Date.now(), price: cur})
                if (history.value.length > HISTORY_LIMIT) {
                    history.value.splice(0, history.value.length - HISTORY_LIMIT)
                }
            }
        } catch { /* ignore */
        }
    }

    ws.onclose = () => {
        starting = false
        connected.value = false
        ws = null
        if (refCount > 0) {
            reconnectTimer = setTimeout(connect, RECONNECT_DELAY)
        }
    }

    ws.onerror = () => {
        try {
            ws && ws.close()
        } catch { /* ignore */
        }
    }
}

function disconnect() {
    clearTimeout(reconnectTimer)
    reconnectTimer = null
    if (ws) {
        try {
            ws.close()
        } catch { /* ignore */
        }
        ws = null
    }
    connected.value = false
}

export function useBinancePrice() {
    refCount++
    if (refCount === 1) connect()

    onUnmounted(() => {
        refCount = Math.max(0, refCount - 1)
        if (refCount === 0) disconnect()
    })

    return {price, connected, change24h, history}
}
