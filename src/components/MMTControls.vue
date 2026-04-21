<template>
  <div class="mmt-panel">
    <!-- Status Banner -->
    <div :class="{ running: mmt.isRunning.value }" class="status-banner">
      <div :class="{ active: mmt.isRunning.value }" class="status-dot"></div>
      <span class="status-text">MMT ENGINE — {{ mmt.isRunning.value ? 'RUNNING' : 'IDLE' }}</span>
      <span class="status-right">{{ store.stats.placed }} placed</span>
    </div>

    <!-- Controls Grid -->
    <div class="controls-grid">
      <div class="ctrl-group">
        <label class="ctrl-label">SPEED (orders/s)</label>
        <div class="speed-btns">
          <button
              v-for="s in [1, 2, 5, 10, 20]"
              :key="s"
              :class="{ active: mmt.speed.value === s }"
              class="speed-btn"
              @click="mmt.speed.value = s"
          >{{ s }}x
          </button>
        </div>
      </div>

      <div class="ctrl-group">
        <label class="ctrl-label">BATCH SIZE</label>
        <div class="slider-row">
          <input
              :value="mmt.batchSize.value" class="slider" max="20" min="1"
              step="1"
              type="range"
              @input="mmt.batchSize.value = +$event.target.value"
          />
          <span class="slider-val">{{ mmt.batchSize.value }}</span>
        </div>
      </div>

      <div class="ctrl-group">
        <label class="ctrl-label">SPREAD (½ width %)</label>
        <div class="slider-row">
          <input
              :value="mmt.spreadPct.value" class="slider" max="2.0" min="0.05"
              step="0.05"
              type="range"
              @input="mmt.spreadPct.value = +$event.target.value"
          />
          <span class="slider-val">{{ Number(mmt.spreadPct.value).toFixed(2) }}%</span>
        </div>
      </div>

      <div class="ctrl-group">
        <label class="ctrl-label aggression-label">
          AGGRESSION — {{ aggressionLabel }}
        </label>
        <div class="slider-row">
          <input
              :style="aggressionStyle" :value="mmt.aggressionPct.value" class="slider aggression-slider" max="100"
              min="0"
              step="5"
              type="range"
              @input="mmt.aggressionPct.value = +$event.target.value"
          />
          <span :style="{ color: aggressionColor }" class="slider-val">
            {{ mmt.aggressionPct.value }}%
          </span>
        </div>
        <div class="aggression-hints">
          <span>0% = passive only</span>
          <span>100% = all cross</span>
        </div>
      </div>

      <div class="ctrl-group">
        <label class="ctrl-label">AUTO-CANCEL (ms)</label>
        <div class="slider-row">
          <input
              :value="mmt.cancelAfterMs.value" class="slider" max="60000" min="5000"
              step="1000"
              type="range"
              @input="mmt.cancelAfterMs.value = +$event.target.value"
          />
          <span class="slider-val">{{ Math.round(mmt.cancelAfterMs.value / 1000) }}s</span>
        </div>
      </div>
    </div>

    <!-- Binance Live Price -->
    <div class="binance-price">
      <div class="bp-source">
        <span :class="{ online: mmt.binance.connected.value }" class="bp-dot"></span>
        <span class="bp-label">BINANCE BTC/USDT</span>
      </div>
      <div class="bp-right">
        <span :class="priceClass" class="bp-val">
          {{
            mmt.binance.price.value > 0 ? mmt.binance.price.value.toLocaleString('en-US', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2
            }) : '—'
          }}
        </span>
        <span
            :class="(mmt.binance.change24h.value ?? 0) >= 0 ? 'up' : 'down'"
            class="bp-change"
        >
          {{ (mmt.binance.change24h.value ?? 0) >= 0 ? '+' : '' }}{{ (mmt.binance.change24h.value ?? 0).toFixed(2) }}%
        </span>
      </div>
    </div>

    <!-- Action Buttons -->
    <div class="action-btns">
      <button
          :class="{ active: mmt.isRunning.value }"
          class="btn btn-start"
          @click="toggleEngine"
      >
        {{ mmt.isRunning.value ? '⏹ STOP' : '▶ START' }}
      </button>

      <button :disabled="flooding" class="btn btn-flood" @click="handleFlood">
        {{ flooding ? 'FLOODING...' : '⚡ FLOOD 100' }}
      </button>

      <button class="btn btn-cancel" @click="handleCancelAll">
        ✕ CANCEL ALL
      </button>

      <button class="btn btn-reset" @click="handleReset">
        ↺ RESET
      </button>
    </div>

    <!-- Mini Stats -->
    <div class="mini-stats">
      <div class="mini-stat">
        <span class="ms-val buy">{{ store.stats.placed }}</span>
        <span class="ms-label">PLACED</span>
      </div>
      <div class="mini-stat">
        <span class="ms-val match">{{ store.stats.matched }}</span>
        <span class="ms-label">MATCHED</span>
      </div>
      <div class="mini-stat">
        <span class="ms-val cancel">{{ store.stats.cancelled }}</span>
        <span class="ms-label">CANCELLED</span>
      </div>
      <div class="mini-stat">
        <span class="ms-val vol">{{ fmtVolume(obVolume) }}</span>
        <span class="ms-label">VOLUME</span>
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
  const sum = (arr) => arr.reduce((s, o) => s + o.volume, 0)
  return sum(store.asks) + sum(store.bids)
})

const aggressionColor = computed(() => {
  if (mmt.aggressionPct.value === 0) return '#3a5a7a'
  if (mmt.aggressionPct.value <= 25) return '#22c55e'
  if (mmt.aggressionPct.value <= 60) return '#f59e0b'
  return '#ef4444'
})

const aggressionStyle = computed(() => ({
  accentColor: aggressionColor.value,
}))

const aggressionLabel = computed(() => {
  const v = mmt.aggressionPct.value
  if (v === 0) return 'PASSIVE ONLY — NO MATCHES'
  if (v <= 20) return 'MOSTLY PASSIVE'
  if (v <= 50) return 'BALANCED'
  if (v <= 80) return 'MOSTLY AGGRESSIVE'
  return 'FULL AGGRESSION'
})

const displayMid = computed(() => {
  const m = parseFloat(store.midPrice) || mmt.userMidPrice.value
  return m.toFixed(2)
})

// Watch for price direction
let prevDisplayMid = 0
setInterval(() => {
  const cur = parseFloat(displayMid.value)
  if (prevDisplayMid && cur !== prevDisplayMid) {
    priceClass.value = cur > prevDisplayMid ? 'up' : 'down'
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

function fmtVolume(v) {
  if (v >= 1_000_000) return (v / 1_000_000).toFixed(2) + 'M'
  if (v >= 1_000) return (v / 1_000).toFixed(1) + 'K'
  return v.toFixed(0)
}
</script>

<style scoped>
.mmt-panel {
  display: flex;
  flex-direction: column;
  gap: 12px;
  height: 100%;
  background: #0c1220;
  border: 1px solid #1a2a3a;
  border-radius: 6px;
  padding: 14px;
  overflow-y: auto;
  font-family: 'JetBrains Mono', monospace;
}

/* Status banner */
.status-banner {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: #0f1a28;
  border: 1px solid #1e3048;
  border-radius: 4px;
  transition: border-color 0.3s, background 0.3s;
}

.status-banner.running {
  border-color: #22c55e55;
  background: #0a1f12;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #3a5a7a;
  transition: background 0.3s;
}

.status-dot.active {
  background: #22c55e;
  box-shadow: 0 0 8px #22c55e;
  animation: pulse 1s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

.status-text {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 1.5px;
  color: #7aa2c8;
  flex: 1;
}

.status-right {
  font-size: 10px;
  color: #4a6a8a;
}

/* Controls */
.controls-grid {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.ctrl-group {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.ctrl-label {
  font-size: 9px;
  font-weight: 700;
  color: #3a5a7a;
  letter-spacing: 1.2px;
  text-transform: uppercase;
}

.speed-btns {
  display: flex;
  gap: 4px;
}

.speed-btn {
  flex: 1;
  padding: 5px 0;
  background: #0f1a28;
  border: 1px solid #1e3048;
  border-radius: 3px;
  color: #4a6a8a;
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
}

.speed-btn:hover {
  border-color: #3b82f6;
  color: #3b82f6;
}

.speed-btn.active {
  background: #1a3060;
  border-color: #3b82f6;
  color: #60a5fa;
}

.slider-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.slider {
  flex: 1;
  height: 3px;
  accent-color: #3b82f6;
  cursor: pointer;
}

.slider-val {
  font-size: 11px;
  color: #60a5fa;
  font-weight: 600;
  min-width: 40px;
  text-align: right;
}

.ctrl-input {
  background: #0f1a28;
  border: 1px solid #1e3048;
  border-radius: 3px;
  color: #e2e8f0;
  font-family: 'JetBrains Mono', monospace;
  font-size: 12px;
  padding: 5px 8px;
  outline: none;
  transition: border-color 0.15s;
}

.ctrl-input:focus {
  border-color: #3b82f6;
}

/* Binance live price */
.binance-price {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  background: #060e1a;
  border: 1px solid #1e3048;
  border-radius: 4px;
}

.bp-source {
  display: flex;
  align-items: center;
  gap: 6px;
}

.bp-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #2a4a6a;
  flex-shrink: 0;
  transition: background 0.3s;
}

.bp-dot.online {
  background: #f59e0b;
  box-shadow: 0 0 6px #f59e0b;
  animation: bpPulse 1.5s ease-in-out infinite;
}

@keyframes bpPulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.4;
  }
}

.bp-label {
  font-size: 9px;
  font-weight: 700;
  color: #3a5a7a;
  letter-spacing: 1px;
}

.bp-right {
  display: flex;
  align-items: baseline;
  gap: 8px;
}

.bp-val {
  font-size: 20px;
  font-weight: 700;
  color: #e2e8f0;
  font-family: 'JetBrains Mono', monospace;
  transition: color 0.25s;
}

.bp-val.up {
  color: #22c55e;
}

.bp-val.down {
  color: #ef4444;
}

.bp-change {
  font-size: 11px;
  font-weight: 600;
  font-family: 'JetBrains Mono', monospace;
}

.bp-change.up {
  color: #22c55e;
}

.bp-change.down {
  color: #ef4444;
}

.aggression-label {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 6px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.aggression-hints {
  display: flex;
  justify-content: space-between;
  font-size: 8px;
  color: #2a4a6a;
  margin-top: 2px;
  letter-spacing: 0.5px;
}

/* Action buttons */
.action-btns {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.btn {
  padding: 9px 0;
  border-radius: 4px;
  border: 1px solid;
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.8px;
  cursor: pointer;
  transition: all 0.15s;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-start {
  background: #0a2a14;
  border-color: #22c55e55;
  color: #22c55e;
}

.btn-start:hover {
  background: #0f3a1c;
  border-color: #22c55e;
}

.btn-start.active {
  background: #3a0a0a;
  border-color: #ef4444;
  color: #ef4444;
}

.btn-flood {
  background: #1a1a0a;
  border-color: #f59e0b55;
  color: #f59e0b;
}

.btn-flood:hover {
  background: #2a2a0c;
  border-color: #f59e0b;
}

.btn-cancel {
  background: #2a0a0a;
  border-color: #ef444455;
  color: #ef4444;
}

.btn-cancel:hover {
  background: #3a0f0f;
  border-color: #ef4444;
}

.btn-reset {
  background: #0a1a2a;
  border-color: #3b82f655;
  color: #3b82f6;
}

.btn-reset:hover {
  background: #0f2a3a;
  border-color: #3b82f6;
}

/* Mini stats */
.mini-stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 6px;
  margin-top: auto;
}

.mini-stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 8px 4px;
  background: #060e1a;
  border: 1px solid #1a2a3a;
  border-radius: 4px;
}

.ms-val {
  font-size: 16px;
  font-weight: 700;
}

.ms-val.buy {
  color: #22c55e;
}

.ms-val.match {
  color: #f59e0b;
}

.ms-val.cancel {
  color: #ef4444;
}

.ms-val.vol {
  color: #a78bfa;
  font-size: 13px;
}

.ms-label {
  font-size: 8px;
  color: #3a5a7a;
  font-weight: 600;
  letter-spacing: 1px;
  margin-top: 2px;
}
</style>