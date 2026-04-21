<template>
  <div class="order-book">
    <div class="ob-header">
      <span class="ob-title">ORDER BOOK</span>
      <span class="ob-symbol">BTC / USDT</span>
    </div>

    <div class="ob-cols">
      <span class="col-label">PRICE</span>
      <span class="col-label right">SIZE</span>
      <span class="col-label right">TOTAL</span>
    </div>

    <!-- Asks (sell side) — lowest first at bottom -->
    <div class="asks-wrap">
      <div
          v-for="row in asksSlice"
          :key="row.price"
          :style="{ '--depth': row.depthPct + '%' }"
          class="ob-row ask"
      >
        <span class="ob-price ask">{{ row.price.toFixed(2) }}</span>
        <span class="ob-vol">{{ row.volume.toFixed(4) }}</span>
        <span class="ob-total">{{ row.cumTotal.toFixed(4) }}</span>
      </div>
    </div>

    <!-- Spread -->
    <div class="spread-bar">
      <span class="spread-label">SPREAD</span>
      <span class="spread-val">{{ store.spread }}</span>
      <span class="mid-label">MID</span>
      <span class="mid-val">{{ store.midPrice }}</span>
    </div>

    <!-- Bids (buy side) — highest first at top -->
    <div class="bids-wrap">
      <div
          v-for="row in bidsSlice"
          :key="row.price"
          :style="{ '--depth': row.depthPct + '%' }"
          class="ob-row bid"
      >
        <span class="ob-price bid">{{ row.price.toFixed(2) }}</span>
        <span class="ob-vol">{{ row.volume.toFixed(4) }}</span>
        <span class="ob-total">{{ row.cumTotal.toFixed(4) }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import {computed} from 'vue'
import {useTradingStore} from '../stores/trading.js'

const store = useTradingStore()

function withDepth(rows, reverse = false) {
  const maxVol = rows.reduce((m, r) => Math.max(m, r.volume), 0) || 1
  let cum = 0
  const out = rows.map(r => {
    cum += r.volume
    return {...r, cumTotal: cum, depthPct: (r.volume / maxVol) * 100}
  })
  return reverse ? out.slice().reverse() : out
}

const asksSlice = computed(() => withDepth(store.asks.slice(0, 14), true))
const bidsSlice = computed(() => withDepth(store.bids.slice(0, 14)))
</script>

<style scoped>
.order-book {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #0c1220;
  border: 1px solid #1a2a3a;
  border-radius: 6px;
  overflow: hidden;
  font-family: 'JetBrains Mono', monospace;
}

.ob-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 12px 8px;
  border-bottom: 1px solid #1a2a3a;
}

.ob-title {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 1.5px;
  color: #7aa2c8;
}

.ob-symbol {
  font-size: 11px;
  color: #4a6a8a;
  letter-spacing: 1px;
}

.ob-cols {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  padding: 4px 10px;
  border-bottom: 1px solid #121e2c;
}

.col-label {
  font-size: 9px;
  font-weight: 600;
  color: #3a5a7a;
  letter-spacing: 1px;
  text-transform: uppercase;
}

.col-label.right {
  text-align: right;
}

.asks-wrap,
.bids-wrap {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.asks-wrap {
  justify-content: flex-end;
}

.ob-row {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  padding: 2px 10px;
  position: relative;
  cursor: default;
  transition: background 0.1s;
}

.ob-row::before {
  content: '';
  position: absolute;
  top: 0;
  bottom: 0;
  right: 0;
  width: var(--depth, 0%);
  opacity: 0.12;
  pointer-events: none;
}

.ob-row.ask::before {
  background: #ef4444;
}

.ob-row.bid::before {
  background: #22c55e;
}

.ob-row:hover {
  background: rgba(255, 255, 255, 0.03);
}

.ob-price {
  font-size: 12px;
  font-weight: 600;
}

.ob-price.ask {
  color: #ef4444;
}

.ob-price.bid {
  color: #22c55e;
}

.ob-vol,
.ob-total {
  font-size: 11px;
  color: #7a9ab8;
  text-align: right;
}

.spread-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
  background: #0f1a28;
  border-top: 1px solid #1a2a3a;
  border-bottom: 1px solid #1a2a3a;
}

.spread-label,
.mid-label {
  font-size: 9px;
  font-weight: 600;
  color: #3a5a7a;
  letter-spacing: 1px;
}

.spread-val {
  font-size: 11px;
  color: #f59e0b;
  font-weight: 600;
  margin-right: 12px;
}

.mid-val {
  font-size: 12px;
  color: #e2e8f0;
  font-weight: 700;
}
</style>