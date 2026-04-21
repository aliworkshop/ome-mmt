<template>
  <div class="d-flex flex-column h-100 p-3 gap-3">
    <!-- Stat cards -->
    <div class="row g-2">
      <div class="col">
        <div class="stat-card">
          <span class="mono fw-bold fs-4 text-light">{{ store.matchedOrders.length }}</span>
          <span class="micro-label">TOTAL TRADES</span>
        </div>
      </div>
      <div class="col">
        <div class="stat-card">
          <span class="mono fw-bold fs-4 text-buy">{{ buyCount }}</span>
          <span class="micro-label">BUY SIDE</span>
        </div>
      </div>
      <div class="col">
        <div class="stat-card">
          <span class="mono fw-bold fs-4 text-sell">{{ sellCount }}</span>
          <span class="micro-label">SELL SIDE</span>
        </div>
      </div>
      <div class="col">
        <div class="stat-card">
          <span class="mono fw-bold fs-4 text-purple">{{ fmtVolume(store.stats.volume) }}</span>
          <span class="micro-label">TOTAL VOLUME</span>
        </div>
      </div>
      <div class="col">
        <div class="stat-card">
          <span class="mono fw-bold fs-4 text-gold">{{ avgPrice }}</span>
          <span class="micro-label">AVG PRICE</span>
        </div>
      </div>
      <div class="col">
        <div class="stat-card">
          <span class="mono fw-bold fs-4 text-light">{{ store.stats.placed }}</span>
          <span class="micro-label">ORDERS PLACED</span>
        </div>
      </div>
    </div>

    <!-- Table -->
    <div class="card bg-panel flex-grow-1 overflow-hidden d-flex flex-column">
      <div class="table-wrap flex-grow-1 overflow-auto">
        <table class="table table-sm table-dark table-hover mono mb-0 align-middle">
          <thead class="sticky-top">
          <tr>
            <th class="micro-label" scope="col">#</th>
            <th class="micro-label" scope="col">TIME</th>
            <th class="micro-label" scope="col">ORDER ID</th>
            <th class="micro-label" scope="col">SIDE</th>
            <th class="micro-label" scope="col">PRICE</th>
            <th class="micro-label" scope="col">QTY</th>
            <th class="micro-label" scope="col">VALUE (USDT)</th>
          </tr>
          </thead>
          <TransitionGroup name="match" tag="tbody">
            <tr
                v-for="(order, idx) in sortedMatches"
                :key="order.id + order.matched_at"
                :class="{ 'is-new': order.new }"
            >
              <td class="text-secondary small">{{ store.matchedOrders.length - idx }}</td>
              <td class="text-muted-2 small">{{ fmtTime(order.matched_at) }}</td>
              <td class="text-info-emphasis small text-truncate" style="max-width: 180px">{{ order.id }}</td>
              <td>
                <span :class="order.side === 'buy' ? 'chip chip-buy' : 'chip chip-sell'">
                  {{ order.side?.toUpperCase() }}
                </span>
              </td>
              <td :class="order.side === 'buy' ? 'text-buy' : 'text-sell'"
                  class="fw-semibold">
                {{ order.price }}
              </td>
              <td class="text-info-emphasis">{{ order.quantity }}</td>
              <td class="text-purple">{{ fmtValue(order.price, order.quantity) }}</td>
            </tr>
          </TransitionGroup>
        </table>

        <div v-if="!store.matchedOrders.length" class="empty-state">
          <i class="bi bi-lightning-charge display-4 text-secondary opacity-50"></i>
          <div class="mono fw-semibold text-secondary">No matched orders yet</div>
          <div class="small text-muted-2">Start the MMT engine to generate trades</div>
        </div>
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
.stat-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 0.875rem 0.5rem;
  background: #0c1220;
  border: 1px solid #1a2a3a;
  border-radius: 0.5rem;
  line-height: 1.2;
}

.table-wrap {
  min-height: 0;
}

.table-dark {
  --bs-table-bg: transparent;
  --bs-table-striped-bg: transparent;
  --bs-table-hover-bg: rgba(255, 255, 255, 0.02);
  --bs-table-border-color: #0f1a28;
}

.table-dark thead tr {
  background: #0f1a28;
}

.table-dark thead th {
  border-bottom: 1px solid #1a2a3a !important;
  font-size: 0.625rem;
  padding: 0.625rem 0.75rem;
}

.table-dark tbody td {
  font-size: 0.75rem;
  padding: 0.4rem 0.75rem;
}

tr.is-new {
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

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 5rem 1rem;
}

.match-enter-active {
  transition: all 0.3s ease;
}

.match-enter-from {
  opacity: 0;
  transform: translateY(-10px);
}
</style>
