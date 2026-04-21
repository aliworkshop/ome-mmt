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

    <!-- Tabs -->
    <ul class="nav nav-tabs mc-tabs mono">
      <li class="nav-item flex-grow-1">
        <button :class="{ active: tab === 'mmt' }"
                class="nav-link w-100 py-2 px-2 small fw-bold"
                @click="tab = 'mmt'">
          <i class="bi bi-cpu me-1"></i>MMT
        </button>
      </li>
      <li class="nav-item flex-grow-1">
        <button :class="{ active: tab === 'manual' }"
                class="nav-link w-100 py-2 px-2 small fw-bold"
                @click="tab = 'manual'">
          <i class="bi bi-hand-index me-1"></i>MANUAL
        </button>
      </li>
    </ul>

    <div v-show="tab === 'mmt'" class="p-3 flex-column gap-3 overflow-auto flex-grow-1">
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

    <!-- MANUAL tab -->
    <div v-show="tab === 'manual'" class="p-3 flex-column gap-3 overflow-auto flex-grow-1">
      <!-- Side toggle -->
      <div>
        <label class="micro-label d-block mb-1">SIDE</label>
        <div class="btn-group w-100" role="group">
          <button :class="manual.side === 'buy' ? 'btn-success' : 'btn-outline-secondary'"
                  class="btn btn-sm mono fw-bold"
                  type="button"
                  @click="manual.side = 'buy'">
            <i class="bi bi-arrow-up"></i> BUY
          </button>
          <button :class="manual.side === 'sell' ? 'btn-danger' : 'btn-outline-secondary'"
                  class="btn btn-sm mono fw-bold"
                  type="button"
                  @click="manual.side = 'sell'">
            <i class="bi bi-arrow-down"></i> SELL
          </button>
        </div>
      </div>

      <!-- Price -->
      <div>
        <div class="d-flex justify-content-between align-items-center mb-1">
          <label class="micro-label mb-0">PRICE (USDT)</label>
          <span class="mono small text-secondary">mid {{ displayMid }}</span>
        </div>
        <div class="input-group input-group-sm">
          <input v-model="manual.price"
                 class="form-control mono bg-dark text-light border-secondary"
                 min="0"
                 step="0.01"
                 type="number">
          <button class="btn btn-outline-secondary mono" type="button" @click="fillMid">
            MID
          </button>
        </div>
      </div>

      <!-- Quantity -->
      <div>
        <div class="d-flex justify-content-between align-items-center mb-1">
          <label class="micro-label mb-0">QUANTITY (BTC)</label>
        </div>
        <div class="input-group input-group-sm">
          <input v-model="manual.quantity"
                 class="form-control mono bg-dark text-light border-secondary"
                 min="0"
                 step="0.0001"
                 type="number">
          <button v-for="q in [0.001, 0.01, 0.1]"
                  :key="q"
                  class="btn btn-outline-secondary mono"
                  type="button"
                  @click="manual.quantity = q">
            {{ q }}
          </button>
        </div>
      </div>

      <!-- Notional preview -->
      <div class="notional-box mono small">
        <span class="micro-label">NOTIONAL</span>
        <span class="fw-bold text-light">{{ fmtUsdt(manualNotional) }} USDT</span>
      </div>

      <!-- Submit -->
      <button :class="manual.side === 'buy' ? 'btn-success' : 'btn-danger'"
              :disabled="placing || !canPlace"
              class="btn btn-sm mono fw-bold col-sm-12"
              @click="handlePlaceManual">
        <i :class="placing ? 'bi bi-hourglass-split' : 'bi bi-send-fill'"></i>
        {{ placing ? 'PLACING…' : `PLACE LIMIT ${manual.side.toUpperCase()}` }}
      </button>

      <!-- Last result -->
      <div v-if="lastResult" :class="lastResult.ok ? 'ok' : 'err'" class="manual-result mono small">
        <div class="d-flex justify-content-between fw-bold mb-1">
          <span>{{ lastResult.ok ? 'SENT' : 'FAILED' }}</span>
          <span class="text-secondary">{{ lastResult.time }}</span>
        </div>
        <div class="text-secondary" style="word-break: break-all">{{ lastResult.message }}</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import {ref, reactive, computed, watch} from 'vue'
import {useMMT} from '../composables/useMMT.js'
import {useTradingStore} from '../stores/trading.js'

const store = useTradingStore()
const mmt = useMMT()

const tab = ref('mmt')
const flooding = ref(false)
const priceClass = ref('')

const displayMid = computed(() => {
  const m = parseFloat(store.midPrice) || mmt.effectiveMid.value
  return m.toFixed(2)
})

const manual = reactive({side: 'buy', price: '', quantity: '0.0100'})
const placing = ref(false)
const lastResult = ref(null)

const manualNotional = computed(() => {
  const p = parseFloat(manual.price) || 0
  const q = parseFloat(manual.quantity) || 0
  return p * q
})

const canPlace = computed(() => {
  const p = parseFloat(manual.price)
  const q = parseFloat(manual.quantity)
  return Number.isFinite(p) && p > 0 && Number.isFinite(q) && q > 0
})

function fillMid() {
  const m = parseFloat(displayMid.value)
  if (m > 0) manual.price = m.toFixed(2)
}

// Auto-fill the price with the current mid the first time the user opens
// the Manual tab, or when a live mid becomes available while they're on it.
watch(
    [tab, () => displayMid.value],
    ([t, m]) => {
      if (t !== 'manual') return
      if (manual.price !== '' && parseFloat(manual.price) > 0) return
      const mid = parseFloat(m)
      if (mid > 0) manual.price = mid.toFixed(2)
    },
    {immediate: true},
)

async function handlePlaceManual() {
  if (!canPlace.value || placing.value) return
  placing.value = true
  const stamp = new Date().toLocaleTimeString()
  const priceStr = parseFloat(manual.price).toFixed(2)
  const qtyStr = parseFloat(manual.quantity).toFixed(4)
  try {
    const {id, filled, rested} = await mmt.placeManual({
      side: manual.side,
      price: priceStr,
      quantity: qtyStr,
    })
    const parts = [`${manual.side.toUpperCase()} ${qtyStr} @ ${priceStr}`]
    if (filled > 1e-8) parts.push(`filled ${filled.toFixed(4)}`)
    if (rested > 1e-8) parts.push(`rested ${rested.toFixed(4)}`)
    parts.push(`id ${id}`)
    lastResult.value = {ok: true, time: stamp, message: parts.join(' · ')}
  } catch (e) {
    lastResult.value = {
      ok: false,
      time: stamp,
      message: e?.message || 'unknown error',
    }
  } finally {
    placing.value = false
  }
}

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

.mc-tabs {
  border-bottom: 1px solid #121e2c;
  flex-shrink: 0;
  background: #0a0f1e;
}

.mc-tabs .nav-item {
  margin-bottom: 0;
}

.mc-tabs .nav-link {
  color: #4a6a8a;
  background: transparent;
  border: none;
  border-bottom: 2px solid transparent;
  border-radius: 0;
  letter-spacing: 0.08em;
  transition: all 0.15s ease;
}

.mc-tabs .nav-link:hover {
  color: #7aa2c8;
}

.mc-tabs .nav-link.active {
  color: #60a5fa;
  background: #0f1a28;
  border-bottom-color: #3b82f6;
}

.notional-box {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 0.75rem;
  background: #060e1a;
  border: 1px solid #1a2a3a;
  border-radius: 0.375rem;
}

.manual-result {
  padding: 0.625rem 0.75rem;
  border-radius: 0.375rem;
  border: 1px solid;
}

.manual-result.ok {
  background: rgba(34, 197, 94, 0.08);
  border-color: rgba(34, 197, 94, 0.35);
}

.manual-result.err {
  background: rgba(239, 68, 68, 0.08);
  border-color: rgba(239, 68, 68, 0.35);
}
</style>
