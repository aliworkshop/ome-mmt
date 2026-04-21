<template>
  <div class="d-flex flex-column vh-100 overflow-hidden">
    <!-- Header -->
    <nav class="app-navbar d-flex align-items-center justify-content-between px-3">
      <div class="d-flex align-items-center gap-3">
        <span class="navbar-brand mono fw-bold mb-0 fs-6 text-light">OME</span>
        <span class="badge border border-warning text-warning bg-transparent fw-semibold mono">
          BTC / USDT
        </span>
      </div>

      <ul class="nav nav-pills gap-1 mb-0">
        <li class="nav-item">
          <button :class="{ active: slide === 0 }"
                  class="nav-link py-1 px-3 mono small fw-bold"
                  @click="slide = 0">
            <i class="bi bi-graph-up-arrow me-1"></i>TRADING FLOOR
          </button>
        </li>
        <li class="nav-item">
          <button :class="{ active: slide === 1 }"
                  class="nav-link py-1 px-3 mono small fw-bold position-relative"
                  @click="slide = 1">
            <i class="bi bi-lightning-charge-fill me-1"></i>MATCHED ORDERS
            <span v-if="store.matchedOrders.length"
                  class="badge bg-warning text-dark ms-1">
              {{ store.matchedOrders.length }}
            </span>
          </button>
        </li>
      </ul>

      <div class="d-flex align-items-center gap-2">
        <div class="stat-chip">
          <span class="micro-label">MATCHED</span>
          <span class="mono fw-bold text-gold">{{ store.stats.matched }}</span>
        </div>
        <div class="stat-chip">
          <span class="micro-label">ACTIVE</span>
          <span class="mono fw-bold text-light">{{ store.activeOrders.length }}</span>
        </div>
        <div class="stat-chip">
          <span class="micro-label">VOL</span>
          <span class="mono fw-bold text-purple">{{ fmtVol(store.stats.volume) }}</span>
        </div>
        <div class="d-flex align-items-center gap-1 px-2 py-1 rounded-pill bg-panel-alt">
          <span :class="{ online: store.connected }" class="pulse-dot"></span>
          <span :class="store.connected ? 'text-success' : 'text-secondary'"
                class="mono small fw-bold">
            {{ store.connected ? 'LIVE' : 'OFF' }}
          </span>
        </div>
      </div>
    </nav>

    <!-- Sidebar layout -->
    <div class="layout d-flex flex-grow-1 overflow-hidden">
      <aside class="sidebar sidebar-left p-3 pe-0">
        <OrderBook/>
      </aside>

      <main class="flex-grow-1 position-relative overflow-hidden">
        <Transition :name="slideDir">
          <TradingSlide v-if="slide === 0" key="trading" class="slide position-absolute top-0 start-0 end-0 bottom-0"/>
          <MatchedSlide v-else key="matched" class="slide position-absolute top-0 start-0 end-0 bottom-0"/>
        </Transition>
      </main>

      <aside class="sidebar sidebar-right p-3 ps-0">
        <LiveMatches/>
      </aside>
    </div>
  </div>
</template>

<script setup>
import {ref, watch, onMounted, onUnmounted} from 'vue'
import {useTradingStore} from './stores/trading.js'
import TradingSlide from './components/TradingSlide.vue'
import MatchedSlide from './components/MatchedSlide.vue'
import OrderBook from './components/OrderBook.vue'
import LiveMatches from './components/LiveMatches.vue'

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

<style scoped>
.app-navbar {
  height: 54px;
  background: #0a0f1e;
  border-bottom: 1px solid #1a2a3a;
  flex-shrink: 0;
  gap: 1rem;
}

.nav-pills .nav-link {
  color: #4a6a8a;
  background: transparent;
  border: 1px solid #1a2a3a;
  letter-spacing: 0.08em;
  transition: all 0.15s ease;
}

.nav-pills .nav-link:hover {
  color: #7aa2c8;
  border-color: #3b82f6;
}

.nav-pills .nav-link.active {
  background: #0f1e38;
  border-color: #3b82f6;
  color: #60a5fa;
}

.stat-chip {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 3px 10px;
  background: #0c1220;
  border: 1px solid #1a2a3a;
  border-radius: 4px;
  line-height: 1.1;
  min-width: 58px;
}

.stat-chip .mono {
  font-size: 0.8rem;
}

.sidebar {
  width: 300px;
  flex-shrink: 0;
  height: 100%;
  min-height: 0;
}

.sidebar-left,
.sidebar-right {
  display: flex;
  flex-direction: column;
}

@media (max-width: 1200px) {
  .sidebar {
    width: 260px;
  }
}

@media (max-width: 1000px) {
  .sidebar {
    width: 220px;
  }
}

.slide {
  display: flex;
  flex-direction: column;
}

.slide-left-enter-active,
.slide-left-leave-active,
.slide-right-enter-active,
.slide-right-leave-active {
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s;
}

.slide-left-enter-from {
  transform: translateX(40px);
  opacity: 0;
}

.slide-left-leave-to {
  transform: translateX(-40px);
  opacity: 0;
}

.slide-right-enter-from {
  transform: translateX(-40px);
  opacity: 0;
}

.slide-right-leave-to {
  transform: translateX(40px);
  opacity: 0;
}
</style>
