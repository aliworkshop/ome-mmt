<template>
  <div class="matched-slide">
    <!-- Header Stats -->
    <div class="ms-stats-bar">
      <div class="ms-stat">
        <span class="ms-stat-val">{{ store.matchedOrders.length }}</span>
        <span class="ms-stat-label">TOTAL TRADES</span>
      </div>
      <div class="ms-stat">
        <span class="ms-stat-val buy">{{ buyCount }}</span>
        <span class="ms-stat-label">BUY SIDE</span>
      </div>
      <div class="ms-stat">
        <span class="ms-stat-val sell">{{ sellCount }}</span>
        <span class="ms-stat-label">SELL SIDE</span>
      </div>
      <div class="ms-stat">
        <span class="ms-stat-val vol">{{ fmtVolume(store.stats.volume) }}</span>
        <span class="ms-stat-label">TOTAL VOLUME</span>
      </div>
      <div class="ms-stat">
        <span class="ms-stat-val gold">{{ avgPrice }}</span>
        <span class="ms-stat-label">AVG PRICE</span>
      </div>
      <div class="ms-stat">
        <span class="ms-stat-val">{{ store.stats.placed }}</span>
        <span class="ms-stat-label">ORDERS PLACED</span>
      </div>
    </div>

    <!-- Table -->
    <div class="ms-table-wrap">
      <table class="ms-table">
        <thead>
        <tr>
          <th>#</th>
          <th>TIME</th>
          <th>ORDER ID</th>
          <th>SIDE</th>
          <th>PRICE</th>
          <th>QTY</th>
          <th>VALUE (USDT)</th>
        </tr>
        </thead>
        <tbody>
        <TransitionGroup name="match" tag="tbody">
          <tr
              v-for="(order, idx) in sortedMatches"
              :key="order.id + order.matched_at"
              :class="[order.side, { 'is-new': order.new }]"
          >
            <td class="td-num">{{ store.matchedOrders.length - idx }}</td>
            <td class="td-time">{{ fmtTime(order.matched_at) }}</td>
            <td class="td-id">{{ order.id }}</td>
            <td class="td-side">
                <span :class="order.side" class="side-chip">
                  {{ order.side?.toUpperCase() }}
                </span>
            </td>
            <td :class="order.side" class="td-price">{{ order.price }}</td>
            <td class="td-qty">{{ order.quantity }}</td>
            <td class="td-value">{{ fmtValue(order.price, order.quantity) }}</td>
          </tr>
        </TransitionGroup>
        </tbody>
      </table>
      <div v-if="!store.matchedOrders.length" class="no-matches">
        <div class="no-matches-icon">⚡</div>
        <div class="no-matches-text">No matched orders yet</div>
        <div class="no-matches-sub">Start the MMT engine to generate trades</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import {computed} from 'vue'
import {useTradingStore} from '../stores/trading.js'

const store = useTradingStore()

const sortedMatches = computed(() =>
    store.matchedOrders.slice().sort((a, b) => b.seq - a.seq)
)

const buyCount = computed(() =>
    store.matchedOrders.filter(o => o.side === 'buy').length
)
const sellCount = computed(() =>
    store.matchedOrders.filter(o => o.side === 'sell').length
)
const avgPrice = computed(() => {
  const orders = store.matchedOrders
  if (!orders.length) return '—'
  const sum = orders.reduce((s, o) => s + parseFloat(o.price || 0), 0)
  return (sum / orders.length).toFixed(2)
})

function fmtVolume(v) {
  if (v >= 1_000_000) return (v / 1_000_000).toFixed(3) + 'M'
  if (v >= 1_000) return (v / 1_000).toFixed(2) + 'K'
  return v.toFixed(2)
}

function fmtTime(ts) {
  if (!ts) return '—'
  const d = new Date(ts)
  return d.toTimeString().slice(0, 8) + '.' + String(d.getMilliseconds()).padStart(3, '0')
}

function fmtValue(price, qty) {
  const v = parseFloat(price || 0) * parseFloat(qty || 0)
  if (!v) return '—'
  return v.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})
}
</script>

<style scoped>
.matched-slide {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 10px;
  gap: 10px;
}

/* Stats bar */
.ms-stats-bar {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 8px;
  flex-shrink: 0;
}

.ms-stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 12px 8px;
  background: #0c1220;
  border: 1px solid #1a2a3a;
  border-radius: 6px;
  font-family: 'JetBrains Mono', monospace;
}

.ms-stat-val {
  font-size: 22px;
  font-weight: 700;
  color: #e2e8f0;
}

.ms-stat-val.buy {
  color: #22c55e;
}

.ms-stat-val.sell {
  color: #ef4444;
}

.ms-stat-val.vol {
  color: #a78bfa;
}

.ms-stat-val.gold {
  color: #f59e0b;
}

.ms-stat-label {
  font-size: 9px;
  color: #3a5a7a;
  font-weight: 600;
  letter-spacing: 1px;
  margin-top: 3px;
}

/* Table */
.ms-table-wrap {
  flex: 1;
  overflow-y: auto;
  background: #0c1220;
  border: 1px solid #1a2a3a;
  border-radius: 6px;
}

.ms-table-wrap::-webkit-scrollbar {
  width: 6px;
}

.ms-table-wrap::-webkit-scrollbar-track {
  background: #0a0e1a;
}

.ms-table-wrap::-webkit-scrollbar-thumb {
  background: #1e3048;
  border-radius: 3px;
}

.ms-table {
  width: 100%;
  border-collapse: collapse;
  font-family: 'JetBrains Mono', monospace;
}

.ms-table thead {
  position: sticky;
  top: 0;
  background: #0f1a28;
  z-index: 10;
}

.ms-table thead th {
  padding: 10px 12px;
  font-size: 9px;
  font-weight: 700;
  color: #3a5a7a;
  letter-spacing: 1.2px;
  text-align: left;
  border-bottom: 1px solid #1a2a3a;
}

.ms-table tbody tr {
  border-bottom: 1px solid #0f1a28;
  transition: background 0.15s;
}

.ms-table tbody tr:hover {
  background: rgba(255, 255, 255, 0.02);
}

.ms-table tbody tr.is-new {
  animation: flashMatch 1s ease-out;
}

@keyframes flashMatch {
  0% {
    background: rgba(245, 158, 11, 0.2);
  }
  100% {
    background: transparent;
  }
}

.ms-table td {
  padding: 6px 12px;
  font-size: 11px;
}

.td-num {
  color: #3a5a7a;
  font-size: 10px;
}

.td-time {
  color: #4a6a8a;
  font-size: 10px;
}

.td-id {
  color: #7aa2c8;
  font-size: 10px;
  max-width: 160px;
  overflow: hidden;
  text-overflow: ellipsis;
}

.side-chip {
  display: inline-block;
  padding: 1px 8px;
  border-radius: 3px;
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.5px;
}

.side-chip.buy {
  background: #0a2a14;
  color: #22c55e;
  border: 1px solid #22c55e55;
}

.side-chip.sell {
  background: #2a0a0a;
  color: #ef4444;
  border: 1px solid #ef444455;
}

.td-price {
  font-weight: 600;
  font-size: 12px;
}

.td-price.buy {
  color: #22c55e;
}

.td-price.sell {
  color: #ef4444;
}

.td-qty {
  color: #7aa2c8;
}

.td-value {
  color: #a78bfa;
  font-weight: 500;
}

/* Empty state */
.no-matches {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 20px;
  gap: 8px;
}

.no-matches-icon {
  font-size: 48px;
  opacity: 0.3;
}

.no-matches-text {
  font-family: 'JetBrains Mono', monospace;
  font-size: 14px;
  font-weight: 600;
  color: #3a5a7a;
  letter-spacing: 1px;
}

.no-matches-sub {
  font-family: 'Inter', sans-serif;
  font-size: 12px;
  color: #2a4a6a;
}

/* Transition */
.match-enter-active {
  transition: all 0.3s ease;
}

.match-enter-from {
  opacity: 0;
  transform: translateY(-10px);
}
</style>