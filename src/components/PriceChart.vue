<template>
  <div class="card bg-panel h-100 d-flex flex-column overflow-hidden">
    <div class="panel-header">
      <div class="d-flex align-items-center gap-2">
        <span class="micro-label text-info-emphasis">
          <i class="bi bi-graph-up me-1"></i>PRICE · BTC/USDT
        </span>
        <span :class="{ online: binance.connected.value }" class="pulse-dot gold"></span>
      </div>
      <div class="d-flex align-items-baseline gap-2">
        <span :class="isUp ? 'text-buy' : 'text-sell'" class="mono fw-bold">
          {{ currentPrice }}
        </span>
        <span :class="isUp ? 'text-buy' : 'text-sell'" class="mono small">
          {{ changeStr }}
        </span>
      </div>
    </div>

    <div class="chart-body flex-grow-1 position-relative">
      <svg v-if="points.length > 1"
           :viewBox="`0 0 ${W} ${H}`"
           class="chart-svg"
           preserveAspectRatio="none">
        <defs>
          <linearGradient :id="gradientId" x1="0" x2="0" y1="0" y2="1">
            <stop :stop-color="lineColor" offset="0%" stop-opacity="0.35"/>
            <stop :stop-color="lineColor" offset="100%" stop-opacity="0"/>
          </linearGradient>
        </defs>

        <g class="grid" stroke="#1a2a3a" stroke-width="0.5">
          <line v-for="i in 3" :key="'h' + i" :x1="0" :x2="W" :y1="(i * H) / 4" :y2="(i * H) / 4"/>
        </g>

        <path :d="areaPath" :fill="`url(#${gradientId})`"/>
        <path :d="linePath" :stroke="lineColor" fill="none" stroke-linejoin="round" stroke-width="1.5"/>
      </svg>
      <div v-else class="empty-state">
        <span class="mono small text-secondary">Waiting for ticks…</span>
      </div>

      <div class="price-axis">
        <span class="mono text-muted-2">{{ high.toFixed(2) }}</span>
        <span class="mono text-muted-2">{{ low.toFixed(2) }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import {computed} from 'vue'
import {useBinancePrice} from '../composables/useBinancePrice.js'

const binance = useBinancePrice()
const W = 1000
const H = 200
const gradientId = `pg-${Math.random().toString(36).slice(2, 8)}`

const points = computed(() => binance.history.value)

const high = computed(() => {
  if (!points.value.length) return 0
  return points.value.reduce((m, p) => Math.max(m, p.price), -Infinity)
})

const low = computed(() => {
  if (!points.value.length) return 0
  return points.value.reduce((m, p) => Math.min(m, p.price), Infinity)
})

const isUp = computed(() => {
  if (points.value.length < 2) return true
  return points.value[points.value.length - 1].price >= points.value[0].price
})

const lineColor = computed(() => (isUp.value ? '#22c55e' : '#ef4444'))

const scaled = computed(() => {
  const pts = points.value
  if (pts.length < 2) return []
  const range = Math.max(0.01, high.value - low.value)
  const padY = H * 0.08
  const plotH = H - padY * 2
  return pts.map((p, i) => {
    const x = (i / (pts.length - 1)) * W
    const y = padY + (1 - (p.price - low.value) / range) * plotH
    return [x, y]
  })
})

const linePath = computed(() => {
  const s = scaled.value
  if (!s.length) return ''
  return s.map(([x, y], i) => (i === 0 ? `M${x.toFixed(1)} ${y.toFixed(1)}` : `L${x.toFixed(1)} ${y.toFixed(1)}`)).join(' ')
})

const areaPath = computed(() => {
  const s = scaled.value
  if (!s.length) return ''
  const line = s.map(([x, y], i) => (i === 0 ? `M${x.toFixed(1)} ${y.toFixed(1)}` : `L${x.toFixed(1)} ${y.toFixed(1)}`)).join(' ')
  const [xl] = s[0]
  const [xr] = s[s.length - 1]
  return `${line} L${xr.toFixed(1)} ${H} L${xl.toFixed(1)} ${H} Z`
})

const currentPrice = computed(() =>
    binance.price.value > 0
        ? binance.price.value.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})
        : '—'
)

const changeStr = computed(() => {
  const v = binance.change24h.value ?? 0
  return `${v >= 0 ? '+' : ''}${v.toFixed(2)}%`
})
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

.price-axis {
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  height: calc(100% - 1rem);
  font-size: 0.65rem;
  pointer-events: none;
}
</style>
