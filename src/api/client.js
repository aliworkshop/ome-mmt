const BASE = '/api'

async function request(method, path, body) {
    const opts = {
        method,
        headers: {'Content-Type': 'application/json'},
    }
    if (body !== undefined) opts.body = JSON.stringify(body)
    const res = await fetch(BASE + path, opts)
    if (!res.ok) {
        const err = await res.json().catch(() => ({error: res.statusText}))
        throw new Error(err.error || res.statusText)
    }
    return res.json()
}

export const api = {
    health: () => request('GET', '/health'),
    getOrderBook: () => request('GET', '/orderbook'),
    getMatched: () => request('GET', '/matched'),

    placeLimitOrder: (body) => request('POST', '/orders/limit', body),
    placeMarketOrder: (body) => request('POST', '/orders/market', body),
    cancelOrder: (id) => request('DELETE', `/orders/${encodeURIComponent(id)}`),

    resetOrderBook: () => request('POST', '/orderbook/reset'),
    startOrderBook: () => request('POST', '/orderbook/start'),
    stopOrderBook: () => request('POST', '/orderbook/stop'),
}