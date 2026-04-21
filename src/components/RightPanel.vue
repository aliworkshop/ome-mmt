<template>
  <div class="card bg-panel h-100 d-flex flex-column overflow-hidden">
    <ul class="nav nav-tabs rp-tabs mono">
      <li class="nav-item flex-grow-1">
        <button :class="{ active: tab === 'trades' }"
                class="nav-link w-100 py-2 px-2 small fw-bold"
                @click="tab = 'trades'">
          <i class="bi bi-lightning-charge-fill me-1"></i>LIVE TRADES
          <span v-if="store.matchedOrders.length"
                class="badge bg-warning-subtle text-warning-emphasis ms-1">
            {{ store.matchedOrders.length }}
          </span>
        </button>
      </li>
      <li class="nav-item flex-grow-1">
        <button :class="{ active: tab === 'orders' }"
                class="nav-link w-100 py-2 px-2 small fw-bold"
                @click="tab = 'orders'">
          <i class="bi bi-list-check me-1"></i>ACTIVE
          <span v-if="store.activeOrders.length"
                class="badge bg-info-subtle text-info-emphasis ms-1">
            {{ store.activeOrders.length }}
          </span>
        </button>
      </li>
    </ul>

    <div class="flex-grow-1 min-h-0 position-relative">
      <div v-show="tab === 'trades'" class="pane">
        <LiveMatches :embedded="true"/>
      </div>
      <div v-show="tab === 'orders'" class="pane">
        <ActiveOrders :embedded="true"/>
      </div>
    </div>
  </div>
</template>

<script setup>
import {ref} from 'vue'
import {useTradingStore} from '../stores/trading.js'
import LiveMatches from './LiveMatches.vue'
import ActiveOrders from './ActiveOrders.vue'

const store = useTradingStore()
const tab = ref('trades')
</script>

<style scoped>
.rp-tabs {
  border-bottom: 1px solid #121e2c;
  flex-shrink: 0;
  background: #0a0f1e;
}

.rp-tabs .nav-item {
  margin-bottom: 0;
}

.rp-tabs .nav-link {
  color: #4a6a8a;
  background: transparent;
  border: none;
  border-bottom: 2px solid transparent;
  border-radius: 0;
  letter-spacing: 0.08em;
  transition: all 0.15s ease;
}

.rp-tabs .nav-link:hover {
  color: #7aa2c8;
}

.rp-tabs .nav-link.active {
  color: #60a5fa;
  background: #0f1a28;
  border-bottom-color: #3b82f6;
}

.pane {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  min-height: 0;
}
</style>
