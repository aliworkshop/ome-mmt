<template>
  <div class="app">
    <!-- ── Header ── -->
    <header class="app-header">
      <div class="header-left">
        <div class="logo">
          <span class="logo-cpg">CPG</span>
          <span class="logo-sep">·</span>
          <span class="logo-ome">OME</span>
        </div>
        <div class="pair-badge">BTC / USDT</div>
      </div>

      <nav class="tab-nav">
        <button
            :class="{ active: slide === 0 }"
            class="tab-btn"
            @click="slide = 0"
        >
          <span class="tab-icon">📊</span> TRADING FLOOR
        </button>
        <button
            :class="{ active: slide === 1 }"
            class="tab-btn"
            @click="slide = 1"
        >
          <span class="tab-icon">⚡</span> MATCHED ORDERS
          <span v-if="store.matchedOrders.length" class="tab-badge">
            {{ store.matchedOrders.length }}
          </span>
        </button>
      </nav>

      <div class="header-right">
        <div class="stat-chip">
          <span class="sc-label">MATCHED</span>
          <span class="sc-val gold">{{ store.stats.matched }}</span>
        </div>
        <div class="stat-chip">
          <span class="sc-label">ACTIVE</span>
          <span class="sc-val">{{ store.activeOrders.length }}</span>
        </div>
        <div class="stat-chip">
          <span class="sc-label">VOL</span>
          <span class="sc-val purple">{{ fmtVol(store.stats.volume) }}</span>
        </div>
        <div :class="{ online: store.connected }" :title="store.connected ? 'Connected' : 'Reconnecting...'"
             class="conn-dot">
          <span class="conn-text">{{ store.connected ? 'LIVE' : 'OFF' }}</span>
        </div>
      </div>
    </header>

    <!-- ── Slide Area ── -->
    <main class="slide-area">
      <Transition :name="slideDir">
        <TradingSlide v-if="slide === 0" key="trading" class="slide"/>
        <MatchedSlide v-else key="matched" class="slide"/>
      </Transition>
    </main>
  </div>
</template>

<script setup>
import {ref, watch, onMounted, onUnmounted} from 'vue'
import {useTradingStore} from './stores/trading.js'
import TradingSlide from './components/TradingSlide.vue'
import MatchedSlide from './components/MatchedSlide.vue'

const store = useTradingStore()
const slide = ref(0)
const slideDir = ref('slide-right')

watch(slide, (next, prev) => {
  slideDir.value = next > prev ? 'slide-left' : 'slide-right'
})

onMounted(() => store.connectSSE())
onUnmounted(() => store.disconnectSSE())

function fmtVol(v) {
  if (v >= 1_000_000) return (v / 1_000_000).toFixed(2) + 'M'
  if (v >= 1_000) return (v / 1_000).toFixed(1) + 'K'
  return v.toFixed(0)
}
</script>

<style>
*, *::before, *::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  background: #070c18;
  color: #e2e8f0;
  font-family: 'Inter', sans-serif;
  overflow: hidden;
}

#app {
  height: 100vh;
  display: flex;
  flex-direction: column;
}
</style>

<style scoped>
.app {
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow: hidden;
}

/* Header */
.app-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
  height: 52px;
  background: #0a0f1e;
  border-bottom: 1px solid #1a2a3a;
  flex-shrink: 0;
  gap: 16px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.logo {
  display: flex;
  align-items: center;
  gap: 4px;
  font-family: 'JetBrains Mono', monospace;
  font-weight: 700;
  font-size: 16px;
}

.logo-cpg {
  color: #3b82f6;
}

.logo-sep {
  color: #3a5a7a;
}

.logo-ome {
  color: #e2e8f0;
}

.pair-badge {
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  font-weight: 600;
  color: #f59e0b;
  background: #1a1a0a;
  border: 1px solid #f59e0b44;
  padding: 2px 8px;
  border-radius: 4px;
  letter-spacing: 0.5px;
}

/* Tab nav */
.tab-nav {
  display: flex;
  gap: 4px;
  flex: 1;
  justify-content: center;
}

.tab-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 20px;
  background: transparent;
  border: 1px solid #1a2a3a;
  border-radius: 4px;
  color: #4a6a8a;
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 1px;
  cursor: pointer;
  transition: all 0.2s;
  position: relative;
}

.tab-btn:hover {
  border-color: #3b82f6;
  color: #7aa2c8;
}

.tab-btn.active {
  background: #0f1e38;
  border-color: #3b82f6;
  color: #60a5fa;
}

.tab-icon {
  font-size: 12px;
}

.tab-badge {
  background: #f59e0b;
  color: #000;
  font-size: 9px;
  font-weight: 700;
  padding: 0 5px;
  border-radius: 8px;
  min-width: 18px;
  text-align: center;
}

/* Header right */
.header-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.stat-chip {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 3px 10px;
  background: #0c1220;
  border: 1px solid #1a2a3a;
  border-radius: 4px;
  font-family: 'JetBrains Mono', monospace;
}

.sc-label {
  font-size: 7px;
  color: #3a5a7a;
  font-weight: 700;
  letter-spacing: 1px;
}

.sc-val {
  font-size: 13px;
  font-weight: 700;
  color: #e2e8f0;
}

.sc-val.gold {
  color: #f59e0b;
}

.sc-val.purple {
  color: #a78bfa;
}

.conn-dot {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 3px 10px;
  border-radius: 12px;
  border: 1px solid #1a2a3a;
  background: #0c1220;
}

.conn-dot::before {
  content: '';
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #3a5a7a;
}

.conn-dot.online::before {
  background: #22c55e;
  box-shadow: 0 0 6px #22c55e;
  animation: connPulse 2s ease-in-out infinite;
}

@keyframes connPulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.4;
  }
}

.conn-text {
  font-family: 'JetBrains Mono', monospace;
  font-size: 9px;
  font-weight: 700;
  color: #3a5a7a;
  letter-spacing: 1px;
}

.conn-dot.online .conn-text {
  color: #22c55e;
}

/* Slide area */
.slide-area {
  flex: 1;
  position: relative;
  overflow: hidden;
  min-height: 0;
}

.slide {
  position: absolute;
  inset: 0;
}

/* Slide transitions */
.slide-left-enter-active,
.slide-left-leave-active,
.slide-right-enter-active,
.slide-right-leave-active {
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s;
}

.slide-left-enter-from {
  transform: translateX(60px);
  opacity: 0;
}

.slide-left-leave-to {
  transform: translateX(-60px);
  opacity: 0;
}

.slide-right-enter-from {
  transform: translateX(-60px);
  opacity: 0;
}

.slide-right-leave-to {
  transform: translateX(60px);
  opacity: 0;
}
</style>