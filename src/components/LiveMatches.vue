<template>
  <div class="card bg-panel h-100 d-flex flex-column overflow-hidden">
    <div class="panel-header">
      <div class="d-flex align-items-center gap-2">
        <span class="micro-label text-info-emphasis">
          <i class="bi bi-activity me-1"></i>LIVE TRADES
        </span>
        <span :class="{ gold: store.stats.matched > 0 }" class="pulse-dot"></span>
      </div>
      <span class="badge bg-warning-subtle text-warning-emphasis border border-warning mono">
        {{ store.matchedOrders.length }}
      </span>
    </div>

    <div class="col-head mono">
      <span>SIDE</span>
      <span class="text-end">PRICE</span>
      <span class="text-end">QTY</span>
      <span class="text-end">VALUE</span>
    </div>

    <div class="flex-grow-1 overflow-auto">
      <TransitionGroup name="trade">
        <div
            v-for="order in sorted"
            :key="order.id + order.matched_at"
            :class="{ 'is-new': order.new }"
            class="trade-row mono"
        >
          <span :class="order.side === 'buy' ? 'chip chip-buy' : 'chip chip-sell'">
            {{ order.side === 'buy' ? 'BUY' : 'SELL' }}
          </span>
          <span :class="order.side === 'buy' ? 'text-buy' : 'text-sell'"
                class="text-end fw-semibold">
            {{ order.price }}
          </span>
          <span class="text-end text-secondary">{{ order.quantity }}</span>
          <span class="text-end text-purple">{{ value(order) }}</span>
        </div>
      </TransitionGroup>

      <div v-if="!store.matchedOrders.length" class="empty-state">
        <i class="bi bi-lightning-charge display-6 text-secondary opacity-50"></i>
        <span class="small text-secondary mono">Waiting for matches…</span>
      </div>
    </div>

    <div class="footer-ticker mono">
      <span class="micro-label">MATCHED</span>
      <span class="fw-bold text-gold">{{ store.stats.matched }}</span>
      <span class="text-secondary">|</span>
      <span class="micro-label">VOL</span>
      <span class="fw-bold text-purple">{{ fmtVol(store.stats.volume) }}</span>
    </div>
  </div>
</template>

<script setup>
import {computed} from 'vue'
import {useTradingStore} from '../stores/trading.js'

const store = useTradingStore()

const sorted = computed(() =>
    store.matchedOrders
        .slice()
        .sort((a, b) => b.seq - a.seq)
        .slice(0, 30)
)

function value(order) {
  const v = parseFloat(order.price || 0) * parseFloat(order.quantity || 0)
  if (!v) return '—'
  if (v >= 1000) return (v / 1000).toFixed(1) + 'K'
  return v.toFixed(1)
}

function fmtVol(v) {
  if (v >= 1_000_000) return (v / 1_000_000).toFixed(2) + 'M'
  if (v >= 1_000) return (v / 1_000).toFixed(1) + 'K'
  return v.toFixed(0)
}
</script>

<style scoped>
.col-head {
  display: grid;
  grid-template-columns: 60px 1fr 1fr 1fr;
  gap: 0.25rem;
  padding: 0.25rem 0.75rem;
  border-bottom: 1px solid #121e2c;
  font-size: 0.625rem;
  font-weight: 600;
  color: #3a5a7a;
  letter-spacing: 0.1em;
}

.trade-row {
  display: grid;
  grid-template-columns: 60px 1fr 1fr 1fr;
  gap: 0.25rem;
  align-items: center;
  padding: 0.25rem 0.75rem;
  font-size: 0.75rem;
  border-bottom: 1px solid #0d1825;
}

.trade-row.is-new {
  animation: flashTrade 0.9s ease-out;
}

@keyframes flashTrade {
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
  padding: 3rem 1rem;
}

.footer-ticker {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.5rem 0.75rem;
  border-top: 1px solid #1a2a3a;
  background: #080f1c;
  font-size: 0.75rem;
}

.trade-enter-active {
  transition: all 0.25s ease;
}

.trade-enter-from {
  opacity: 0;
  transform: translateX(16px);
}
</style>
