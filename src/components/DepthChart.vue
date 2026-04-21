<template>
  <div class="card bg-panel h-100 d-flex flex-column overflow-hidden">
    <div class="panel-header">
      <span class="micro-label text-info-emphasis">
        <i class="bi bi-bar-chart-steps me-1"></i>MARKET DEPTH
      </span>
      <div class="d-flex align-items-center gap-2">
        <span class="micro-label">MID</span>
        <span class="mono small fw-bold text-light">{{ store.midPrice || '—' }}</span>
      </div>
    </div>

    <div class="chart-body flex-grow-1 position-relative">
      <svg v-if="hasData"
           :viewBox="`0 0 ${W} ${H}`"
           class="chart-svg"
           preserveAspectRatio="none">
        <g class="grid" stroke="#1a2a3a" stroke-width="0.5">
          <line v-for="i in 3" :key="'h' + i" :x1="0" :x2="W" :y1="(i * H) / 4" :y2="(i * H) / 4"/>
        </g>

        <path v-if="bidPath" :d="bidPath" fill="rgba(34, 197, 94, 0.18)"
              stroke="#22c55e" stroke-width="1.2"/>
        <path v-if="askPath" :d="askPath" fill="rgba(239, 68, 68, 0.18)"
              stroke="#ef4444" stroke-width="1.2"/>

        <line :x1="W / 2" :x2="W / 2" :y2="H" stroke="#4a6a8a"
              stroke-dasharray="3,3" stroke-width="0.6" y1="0"/>
      </svg>
      <div v-else class="empty-state">
        <span class="mono small text-secondary">Waiting for book…</span>
      </div>
    </div>

    <div class="axis-footer mono">
      <span class="text-sell">{{ minPriceLabel }}</span>
      <span class="text-secondary">{{ midLabel }}</span>
      <span class="text-buy">{{ maxPriceLabel }}</span>
    </div>
  </div>
</template>

<script setup>
import {computed} from 'vue'
import {useTradingStore} from '../stores/trading.js'

const store = useTradingStore()
const W = 1000
const H = 200

const bids = computed(() => store.bids)
const asks = computed(() => store.asks)

const hasData = computed(() => bids.value.length > 0 && asks.value.length > 0)

const mid = computed(() => {
  const bestBid = bids.value[0]?.price ?? 0
  const bestAsk = asks.value[0]?.price ?? 0
  if (!bestBid || !bestAsk) return 0
  return (bestBid + bestAsk) / 2
})

// Symmetric price range around mid, capped by furthest side
const priceRange = computed(() => {
  if (!hasData.value) return {min: 0, max: 0, span: 0}
  const lowestBid = bids.value[bids.value.length - 1].price
  const highestAsk = asks.value[asks.value.length - 1].price
  const m = mid.value
  const span = Math.max(m - lowestBid, highestAsk - m)
  return {min: m - span, max: m + span, span}
})

// Cumulative curves — bids accumulate from best (highest) outward to lowest
const bidCurve = computed(() => {
  let cum = 0
  // bids are sorted desc; iterate in that order and cumulate, then reverse for left->right plot
  const pts = bids.value.map(b => {
    cum += b.volume
    return {price: b.price, cum}
  })
  // For SVG (left = low price), reverse so lowest price is first
  return pts.slice().reverse()
})

const askCurve = computed(() => {
  let cum = 0
  return asks.value.map(a => {
    cum += a.volume
    return {price: a.price, cum}
  })
})

const maxCum = computed(() => {
  const bidMax = bidCurve.value.reduce((m, p) => Math.max(m, p.cum), 0)
  const askMax = askCurve.value.reduce((m, p) => Math.max(m, p.cum), 0)
  return Math.max(bidMax, askMax, 1)
})

function xOf(price) {
  const {min, max} = priceRange.value
  if (max <= min) return 0
  return ((price - min) / (max - min)) * W
}

function yOf(cum) {
  const padY = H * 0.08
  const plotH = H - padY * 2
  return padY + (1 - cum / maxCum.value) * plotH
}

const bidPath = computed(() => {
  if (!bidCurve.value.length) return ''
  // Build a stepped area: start from baseline on left, walk through points, back down on right
  const pts = bidCurve.value
  const first = pts[0]
  const last = pts[pts.length - 1]
  const parts = [`M${xOf(first.price).toFixed(1)} ${H}`]
  parts.push(`L${xOf(first.price).toFixed(1)} ${yOf(first.cum).toFixed(1)}`)
  for (let i = 1; i < pts.length; i++) {
    const x = xOf(pts[i].price).toFixed(1)
    parts.push(`L${x} ${yOf(pts[i - 1].cum).toFixed(1)}`)
    parts.push(`L${x} ${yOf(pts[i].cum).toFixed(1)}`)
  }
  parts.push(`L${xOf(last.price).toFixed(1)} ${H} Z`)
  return parts.join(' ')
})

const askPath = computed(() => {
  if (!askCurve.value.length) return ''
  const pts = askCurve.value
  const first = pts[0]
  const last = pts[pts.length - 1]
  const parts = [`M${xOf(first.price).toFixed(1)} ${H}`]
  parts.push(`L${xOf(first.price).toFixed(1)} ${yOf(first.cum).toFixed(1)}`)
  for (let i = 1; i < pts.length; i++) {
    const x = xOf(pts[i].price).toFixed(1)
    parts.push(`L${x} ${yOf(pts[i - 1].cum).toFixed(1)}`)
    parts.push(`L${x} ${yOf(pts[i].cum).toFixed(1)}`)
  }
  parts.push(`L${xOf(last.price).toFixed(1)} ${H} Z`)
  return parts.join(' ')
})

const minPriceLabel = computed(() =>
    hasData.value ? priceRange.value.min.toFixed(2) : '—'
)
const maxPriceLabel = computed(() =>
    hasData.value ? priceRange.value.max.toFixed(2) : '—'
)
const midLabel = computed(() =>
    hasData.value ? mid.value.toFixed(2) : '—'
)
</script>

<style scoped>
.chart-body {
  overflow: hidden;
}

.chart-svg {
  width: 100%;
  height: 100%;
  display: block;
}

.empty-state {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.axis-footer {
  display: flex;
  justify-content: space-between;
  padding: 0.25rem 0.75rem 0.5rem;
  font-size: 0.65rem;
  font-weight: 600;
}
</style>
