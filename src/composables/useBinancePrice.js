import {ref, onUnmounted} from 'vue'

const WS_URL = 'wss://stream.binance.com:9443/ws/btcusdt@miniTicker'
const RECONNECT_DELAY = 3000

export function useBinancePrice() {
    const price = ref(0)
    const connected = ref(false)
    const change24h = ref(0)  // % change from open

    let ws = null
    let reconnectTimer = null
    let destroyed = false

    function connect() {
        if (destroyed) return
        ws = new WebSocket(WS_URL)

        ws.onopen = () => {
            connected.value = true
        }

        ws.onmessage = (e) => {
            try {
                const d = JSON.parse(e.data)
                // miniTicker: c = close/current price, o = open price
                const cur = parseFloat(d.c)
                const open = parseFloat(d.o)
                if (cur > 0) {
                    price.value = cur
                    change24h.value = open > 0 ? ((cur - open) / open) * 100 : 0
                }
            } catch { /* ignore */
            }
        }

        ws.onclose = () => {
            connected.value = false
            if (!destroyed) {
                reconnectTimer = setTimeout(connect, RECONNECT_DELAY)
            }
        }

        ws.onerror = () => {
            ws.close()
        }
    }

    function disconnect() {
        destroyed = true
        clearTimeout(reconnectTimer)
        if (ws) {
            ws.close();
            ws = null
        }
        connected.value = false
    }

    connect()
    onUnmounted(disconnect)

    return {price, connected, change24h, disconnect}
}
