<template>
  <div class="card bg-panel h-100 d-flex flex-column overflow-hidden">
    <div class="panel-header">
      <span class="micro-label text-info-emphasis">
        <i class="bi bi-bookmark-fill me-1"></i>ORDER BOOK
      </span>
      <span class="mono small text-muted-2">BTC / USDT</span>
    </div>

    <div class="col-head mono">
      <span>PRICE</span>
      <span class="text-end">SIZE</span>
      <span class="text-end">TOTAL</span>
    </div>

    <!-- Asks (lowest at bottom) -->
    <div class="ob-half asks">
      <div
          v-for="row in asksSlice"
          :key="row.price"
          :style="{ '--depth': row.depthPct + '%' }"
          class="ob-row ask mono"
      >
        <span class="text-sell fw-semibold">{{ row.price.toFixed(2) }}</span>
        <span class="text-end">{{ row.volume.toFixed(4) }}</span>
        <span class="text-end text-secondary">{{ row.cumTotal.toFixed(4) }}</span>
      </div>
    </div>

    <!-- Spread bar -->
    <div class="spread-bar mono">
      <span class="micro-label">SPREAD</span>
      <span class="text-gold fw-semibold small">{{ store.spread }}</span>
      <span class="micro-label ms-auto">MID</span>
      <span class="fw-bold">{{ store.midPrice }}</span>
    </div>

    <!-- Bids (highest at top) -->
    <div class="ob-half bids">
      <div
          v-for="row in bidsSlice"
          :key="row.price"
          :style="{ '--depth': row.depthPct + '%' }"
          class="ob-row bid mono"
      >
        <span class="text-buy fw-semibold">{{ row.price.toFixed(2) }}</span>
        <span class="text-end">{{ row.volume.toFixed(4) }}</span>
        <span class="text-end text-secondary">{{ row.cumTotal.toFixed(4) }}</span>
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
.col-head {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  padding: 0.25rem 0.75rem;
  font-size: 0.625rem;
  font-weight: 600;
  color: #3a5a7a;
  letter-spacing: 0.1em;
  border-bottom: 1px solid #121e2c;
}

.ob-half {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.ob-half.asks {
  justify-content: flex-end;
}

.ob-row {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  padding: 2px 0.75rem;
  font-size: 0.75rem;
  position: relative;
  transition: background 0.1s;
}

.ob-row::before {
  content: '';
  position: absolute;
  inset: 0 0 0 auto;
  width: var(--depth, 0%);
  opacity: 0.14;
  pointer-events: none;
}

.ob-row.ask::before {
  background: var(--sell);
}

.ob-row.bid::before {
  background: var(--buy);
}

.ob-row:hover {
  background: rgba(255, 255, 255, 0.03);
}

.spread-bar {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.375rem 0.75rem;
  background: #0f1a28;
  border-top: 1px solid #1a2a3a;
  border-bottom: 1px solid #1a2a3a;
  font-size: 0.75rem;
}
</style>
