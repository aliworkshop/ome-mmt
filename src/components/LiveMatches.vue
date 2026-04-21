<template>
  <div class="live-matches">
    <div class="lm-header">
      <div class="lm-title-row">
        <span class="lm-title">LIVE TRADES</span>
        <span :class="{ active: store.stats.matched > 0 }" class="lm-dot"></span>
      </div>
      <span class="lm-count">{{ store.matchedOrders.length }}</span>
    </div>

    <div class="lm-cols">
      <span>SIDE</span>
      <span class="right">PRICE</span>
      <span class="right">QTY</span>
      <span class="right">VALUE</span>
    </div>

    <div ref="listEl" class="lm-list">
      <TransitionGroup name="trade">
        <div
            v-for="order in sorted"
            :key="order.id + order.matched_at"
            :class="[order.side, { 'is-new': order.new }]"
            class="lm-row"
        >
          <span :class="order.side" class="side-chip">
            {{ order.side === 'buy' ? 'BUY' : 'SELL' }}
          </span>
          <span :class="order.side" class="lm-price">{{ order.price }}</span>
          <span class="lm-qty">{{ order.quantity }}</span>
          <span class="lm-value">{{ value(order) }}</span>
        </div>
      </TransitionGroup>

      <div v-if="!store.matchedOrders.length" class="lm-empty">
        <span class="lm-empty-icon">⚡</span>
        <span>Waiting for matches…</span>
      </div>
    </div>

    <!-- Footer ticker -->
    <div class="lm-footer">
      <span class="ft-label">MATCHED</span>
      <span class="ft-val gold">{{ store.stats.matched }}</span>
      <span class="ft-sep">|</span>
      <span class="ft-label">VOL</span>
      <span class="ft-val purple">{{ fmtVol(store.stats.volume) }}</span>
    </div>
  </div>
</template>

<script setup>
import {ref, computed} from 'vue'
import {useTradingStore} from '../stores/trading.js'

const store = useTradingStore()
const listEl = ref(null)

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
.live-matches {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #0c1220;
  border: 1px solid #1a2a3a;
  border-radius: 6px;
  overflow: hidden;
  font-family: 'JetBrains Mono', monospace;
}

/* Header */
.lm-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 12px 8px;
  border-bottom: 1px solid #1a2a3a;
  flex-shrink: 0;
}

.lm-title-row {
  display: flex;
  align-items: center;
  gap: 7px;
}

.lm-title {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 1.5px;
  color: #7aa2c8;
}

.lm-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #2a4a6a;
  transition: background 0.3s;
}

.lm-dot.active {
  background: #f59e0b;
  box-shadow: 0 0 7px #f59e0b;
  animation: blink 1.2s ease-in-out infinite;
}

@keyframes blink {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.35;
  }
}

.lm-count {
  font-size: 12px;
  font-weight: 700;
  color: #f59e0b;
  background: #1a1400;
  border: 1px solid #f59e0b44;
  padding: 1px 8px;
  border-radius: 10px;
}

/* Column headers */
.lm-cols {
  display: grid;
  grid-template-columns: 40px 1fr 1fr 1fr;
  gap: 4px;
  padding: 4px 10px;
  border-bottom: 1px solid #121e2c;
  font-size: 9px;
  font-weight: 600;
  color: #3a5a7a;
  letter-spacing: 1px;
  flex-shrink: 0;
}

.right {
  text-align: right;
}

/* List */
.lm-list {
  flex: 1;
  overflow: hidden;
}

/* Row */
.lm-row {
  display: grid;
  grid-template-columns: 40px 1fr 1fr 1fr;
  gap: 4px;
  align-items: center;
  padding: 4px 10px;
  border-bottom: 1px solid #0d1825;
}

.lm-row.is-new {
  animation: flashTrade 0.9s ease-out;
}

@keyframes flashTrade {
  0% {
    background: rgba(245, 158, 11, 0.22);
  }
  100% {
    background: transparent;
  }
}

.side-chip {
  display: inline-block;
  padding: 1px 4px;
  border-radius: 2px;
  font-size: 8px;
  font-weight: 700;
  letter-spacing: 0.3px;
  text-align: center;
}

.side-chip.buy {
  background: #0a2a14;
  color: #22c55e;
  border: 1px solid #22c55e44;
}

.side-chip.sell {
  background: #2a0a0a;
  color: #ef4444;
  border: 1px solid #ef444444;
}

.lm-price {
  font-size: 11px;
  font-weight: 600;
  text-align: right;
}

.lm-price.buy {
  color: #22c55e;
}

.lm-price.sell {
  color: #ef4444;
}

.lm-qty {
  font-size: 10px;
  color: #7aa2c8;
  text-align: right;
}

.lm-value {
  font-size: 10px;
  color: #a78bfa;
  text-align: right;
}

/* Empty */
.lm-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 40px 0;
  font-size: 11px;
  color: #2a4a6a;
}

.lm-empty-icon {
  font-size: 28px;
  opacity: 0.3;
}

/* Footer */
.lm-footer {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 7px 12px;
  border-top: 1px solid #1a2a3a;
  background: #080f1c;
  flex-shrink: 0;
}

.ft-label {
  font-size: 9px;
  font-weight: 700;
  color: #3a5a7a;
  letter-spacing: 1px;
}

.ft-val {
  font-size: 12px;
  font-weight: 700;
}

.ft-val.gold {
  color: #f59e0b;
}

.ft-val.purple {
  color: #a78bfa;
}

.ft-sep {
  color: #1e3048;
  font-size: 10px;
}

/* Transition */
.trade-enter-active {
  transition: all 0.25s ease;
}

.trade-enter-from {
  opacity: 0;
  transform: translateX(16px);
}
</style>
