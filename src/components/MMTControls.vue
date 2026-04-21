<template>
  <div class="card bg-panel h-100 d-flex flex-column overflow-hidden">
    <!-- Status banner -->
    <div :class="{ running: mmt.isRunning.value }" class="status-banner">
      <span :class="{ online: mmt.isRunning.value }" class="pulse-dot"></span>
      <span class="mono small fw-bold flex-grow-1 text-info-emphasis">
        MMT ENGINE — {{ mmt.isRunning.value ? 'RUNNING' : 'IDLE' }}
      </span>
      <span class="mono small text-secondary">{{ store.stats.placed }} placed</span>
    </div>

    <div class="p-3 d-flex flex-column gap-3 overflow-auto flex-grow-1">
      <!-- Speed -->
      <div>
        <label class="micro-label d-block mb-1">SPEED (orders/s)</label>
        <div class="btn-group w-100" role="group">
          <button
              v-for="s in [1, 2, 5, 10, 20]"
              :key="s"
              :class="mmt.speed.value === s ? 'btn-primary' : 'btn-outline-secondary'"
              class="btn btn-sm mono fw-semibold"
              type="button"
              @click="mmt.speed.value = s"
          >{{ s }}x
          </button>
        </div>
      </div>

      <!-- Batch size -->
      <div>
        <div class="d-flex justify-content-between align-items-center mb-1">
          <label class="micro-label mb-0">BATCH SIZE</label>
          <span class="mono small text-primary fw-semibold">{{ mmt.batchSize.value }}</span>
        </div>
        <input
            :value="mmt.batchSize.value"
            class="form-range"
            max="20" min="1" step="1" type="range" @input="mmt.batchSize.value = +$event.target.value"
        />
      </div>

      <!-- Spread -->
      <div>
        <div class="d-flex justify-content-between align-items-center mb-1">
          <label class="micro-label mb-0">SPREAD (½ WIDTH)</label>
          <span class="mono small text-primary fw-semibold">{{ Number(mmt.spreadPct.value).toFixed(2) }}%</span>
        </div>
        <input
            :value="mmt.spreadPct.value"
            class="form-range"
            max="2.0" min="0.05" step="0.05" type="range" @input="mmt.spreadPct.value = +$event.target.value"
        />
      </div>

      <!-- Aggression -->
      <div>
        <div class="d-flex justify-content-between align-items-center mb-1">
          <label class="micro-label mb-0">AGGRESSION — {{ aggressionLabel }}</label>
          <span :style="{ color: aggressionColor }" class="mono small fw-semibold">
            {{ mmt.aggressionPct.value }}%
          </span>
        </div>
        <input
            :style="{ accentColor: aggressionColor }"
            :value="mmt.aggressionPct.value"
            class="form-range"
            max="100" min="0" step="5" type="range" @input="mmt.aggressionPct.value = +$event.target.value"
        />
        <div class="d-flex justify-content-between mt-1">
          <span class="micro-label" style="font-size: 0.55rem">0% PASSIVE</span>
          <span class="micro-label" style="font-size: 0.55rem">100% CROSS</span>
        </div>
      </div>

      <!-- Auto-cancel -->
      <div>
        <div class="d-flex justify-content-between align-items-center mb-1">
          <label class="micro-label mb-0">AUTO-CANCEL</label>
          <span class="mono small text-primary fw-semibold">{{ Math.round(mmt.cancelAfterMs.value / 1000) }}s</span>
        </div>
        <input
            :value="mmt.cancelAfterMs.value"
            class="form-range"
            max="60000" min="5000" step="1000" type="range" @input="mmt.cancelAfterMs.value = +$event.target.value"
        />
      </div>

      <!-- Binance live price -->
      <div class="binance-price">
        <div class="d-flex align-items-center gap-2">
          <span :class="{ online: mmt.binance.connected.value }" class="pulse-dot gold"></span>
          <span class="micro-label">BINANCE BTC/USDT</span>
        </div>
        <div class="d-flex align-items-baseline gap-2">
          <span :class="priceClass" class="mono fw-bold fs-5">
            {{
              mmt.binance.price.value > 0
                  ? mmt.binance.price.value.toLocaleString('en-US', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                  })
                  : '—'
            }}
          </span>
          <span :class="(mmt.binance.change24h.value ?? 0) >= 0 ? 'text-buy' : 'text-sell'"
                class="mono small fw-semibold">
            {{ (mmt.binance.change24h.value ?? 0) >= 0 ? '+' : '' }}{{ (mmt.binance.change24h.value ?? 0).toFixed(2) }}%
          </span>
        </div>
      </div>

      <!-- Action buttons -->
      <div class="action-grid">
        <button
            :class="mmt.isRunning.value ? 'btn-danger' : 'btn-success'"
            class="btn btn-sm mono fw-bold"
            @click="toggleEngine"
        >
          <i :class="mmt.isRunning.value ? 'bi bi-stop-fill' : 'bi bi-play-fill'"></i>
          {{ mmt.isRunning.value ? 'STOP' : 'START' }}
        </button>
        <button :disabled="flooding"
                class="btn btn-sm btn-warning mono fw-bold"
                @click="handleFlood">
          <i class="bi bi-lightning-fill"></i>
          {{ flooding ? 'FLOODING…' : 'FLOOD 100' }}
        </button>
        <button class="btn btn-sm btn-outline-danger mono fw-bold" @click="handleCancelAll">
          <i class="bi bi-x-lg"></i> CANCEL ALL
        </button>
        <button class="btn btn-sm btn-outline-primary mono fw-bold" @click="handleReset">
          <i class="bi bi-arrow-counterclockwise"></i> RESET
        </button>
      </div>

      <!-- Mini stats -->
      <div class="mini-stats mt-auto">
        <div class="mini-stat">
          <span class="mono fw-bold text-buy">{{ store.stats.placed }}</span>
          <span class="micro-label">PLACED</span>
        </div>
        <div class="mini-stat">
          <span class="mono fw-bold text-gold">{{ store.stats.matched }}</span>
          <span class="micro-label">MATCHED</span>
        </div>
        <div class="mini-stat">
          <span class="mono fw-bold text-sell">{{ store.stats.cancelled }}</span>
          <span class="micro-label">CANCELLED</span>
        </div>
        <div class="mini-stat">
          <span class="mono fw-bold text-purple">{{ fmtUsdt(obVolume) }}</span>
          <span class="micro-label">BOOK (USDT)</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import {ref, computed} from 'vue'
import {useMMT} from '../composables/useMMT.js'
import {useTradingStore} from '../stores/trading.js'

const store = useTradingStore()
const mmt = useMMT()

const flooding = ref(false)
const priceClass = ref('')

const obVolume = computed(() => {
  const sum = (arr) => arr.reduce((s, o) => s + o.price * o.volume, 0)
  return sum(store.asks) + sum(store.bids)
})

const aggressionColor = computed(() => {
  if (mmt.aggressionPct.value === 0) return '#3a5a7a'
  if (mmt.aggressionPct.value <= 25) return '#22c55e'
  if (mmt.aggressionPct.value <= 60) return '#f59e0b'
  return '#ef4444'
})

const aggressionLabel = computed(() => {
  const v = mmt.aggressionPct.value
  if (v === 0) return 'PASSIVE'
  if (v <= 20) return 'MOSTLY PASSIVE'
  if (v <= 50) return 'BALANCED'
  if (v <= 80) return 'MOSTLY CROSS'
  return 'FULL CROSS'
})

const displayMid = computed(() => {
  const m = parseFloat(store.midPrice) || mmt.userMidPrice.value
  return m.toFixed(2)
})

let prevDisplayMid = 0
setInterval(() => {
  const cur = parseFloat(displayMid.value)
  if (prevDisplayMid && cur !== prevDisplayMid) {
    priceClass.value = cur > prevDisplayMid ? 'text-buy' : 'text-sell'
    setTimeout(() => {
      priceClass.value = ''
    }, 600)
  }
  prevDisplayMid = cur
}, 300)

function toggleEngine() {
  mmt.isRunning.value ? mmt.stop() : mmt.start()
}

async function handleFlood() {
  flooding.value = true
  await mmt.flood(100)
  flooding.value = false
}

function handleCancelAll() {
  mmt.cancelAll()
}

function handleReset() {
  mmt.resetAll()
}

function fmtUsdt(v) {
  if (!v) return '0'
  if (v >= 1_000_000_000) return (v / 1_000_000_000).toFixed(2) + 'B'
  if (v >= 1_000_000) return (v / 1_000_000).toFixed(2) + 'M'
  if (v >= 1_000) return (v / 1_000).toFixed(2) + 'K'
  return v.toFixed(2)
}
</script>

<style scoped>
.status-banner {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.625rem 0.875rem;
  background: #0f1a28;
  border-bottom: 1px solid #1a2a3a;
  transition: background 0.3s;
}

.status-banner.running {
  background: #0a1f12;
  border-bottom-color: rgba(34, 197, 94, 0.35);
}

.binance-price {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.625rem 0.875rem;
  background: #060e1a;
  border: 1px solid #1e3048;
  border-radius: 0.375rem;
}

.action-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.5rem;
}

.action-grid .btn {
  letter-spacing: 0.06em;
}

.action-grid .btn i {
  margin-right: 0.25rem;
}

.mini-stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0.375rem;
}

.mini-stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 0.5rem 0.25rem;
  background: #060e1a;
  border: 1px solid #1a2a3a;
  border-radius: 0.375rem;
  line-height: 1.2;
}

.mini-stat .mono {
  font-size: 1rem;
}
</style>
