<template>
  <div class="active-orders">
    <div class="ao-header">
      <span class="ao-title">ACTIVE ORDERS</span>
      <span class="ao-count">{{ store.activeOrders.length }}</span>
    </div>

    <div class="ao-cols">
      <span>SIDE</span>
      <span>PRICE</span>
      <span>QTY</span>
      <span>AGE</span>
      <span></span>
    </div>

    <div ref="listEl" class="ao-list">
      <TransitionGroup name="order">
        <div
            v-for="order in store.activeOrders"
            :key="order.id"
            :class="[order.side, { 'is-new': order.new }]"
            class="ao-row"
        >
          <span :class="order.side" class="side-badge">{{ order.side === 'buy' ? 'B' : 'S' }}</span>
          <span class="ao-price">{{ order.price }}</span>
          <span class="ao-qty">{{ order.quantity }}</span>
          <span class="ao-age">{{ age(order.placedAt) }}</span>
          <button class="cancel-btn" title="Cancel" @click="cancel(order.id)">✕</button>
        </div>
      </TransitionGroup>
      <div v-if="!store.activeOrders.length" class="ao-empty">
        No active orders
      </div>
    </div>
  </div>
</template>

<script setup>
import {ref, onMounted, onUnmounted} from 'vue'
import {api} from '../api/client.js'
import {useTradingStore} from '../stores/trading.js'

const store = useTradingStore()
const listEl = ref(null)

async function cancel(id) {
  try {
    await api.cancelOrder(id)
    store.removeActiveOrder(id)
  } catch {
    store.removeActiveOrder(id)
  }
}

function age(ts) {
  const s = Math.floor((Date.now() - ts) / 1000)
  if (s < 60) return s + 's'
  return Math.floor(s / 60) + 'm'
}

// Re-render ages every second
let timer = null
const tick = ref(0)
onMounted(() => {
  timer = setInterval(() => tick.value++, 1000)
})
onUnmounted(() => clearInterval(timer))
</script>

<style scoped>
.active-orders {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #0c1220;
  border: 1px solid #1a2a3a;
  border-radius: 6px;
  overflow: hidden;
  font-family: 'JetBrains Mono', monospace;
}

.ao-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 12px 8px;
  border-bottom: 1px solid #1a2a3a;
}

.ao-title {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 1.5px;
  color: #7aa2c8;
}

.ao-count {
  font-size: 12px;
  font-weight: 700;
  color: #f59e0b;
  background: #1a1a0a;
  padding: 1px 8px;
  border-radius: 10px;
  border: 1px solid #f59e0b44;
}

.ao-cols {
  display: grid;
  grid-template-columns: 24px 1fr 1fr 32px 20px;
  gap: 4px;
  padding: 4px 10px;
  border-bottom: 1px solid #121e2c;
  font-size: 9px;
  font-weight: 600;
  color: #3a5a7a;
  letter-spacing: 1px;
}

.ao-list {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
}

.ao-list::-webkit-scrollbar {
  width: 4px;
}

.ao-list::-webkit-scrollbar-track {
  background: #0a0e1a;
}

.ao-list::-webkit-scrollbar-thumb {
  background: #1e3048;
  border-radius: 2px;
}

.ao-row {
  display: grid;
  grid-template-columns: 24px 1fr 1fr 32px 20px;
  gap: 4px;
  align-items: center;
  padding: 4px 10px;
  border-bottom: 1px solid #0f1a28;
  transition: background 0.2s;
}

.ao-row:hover {
  background: rgba(255, 255, 255, 0.02);
}

.ao-row.is-new {
  animation: flashIn 0.6s ease-out;
}

@keyframes flashIn {
  0% {
    background: rgba(255, 220, 50, 0.15);
  }
  100% {
    background: transparent;
  }
}

.side-badge {
  width: 16px;
  height: 16px;
  border-radius: 2px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 8px;
  font-weight: 700;
}

.side-badge.buy {
  background: #0a2a14;
  color: #22c55e;
  border: 1px solid #22c55e55;
}

.side-badge.sell {
  background: #2a0a0a;
  color: #ef4444;
  border: 1px solid #ef444455;
}

.ao-price {
  font-size: 10px;
  color: #e2e8f0;
}

.ao-qty {
  font-size: 10px;
  color: #7aa2c8;
  text-align: right;
}

.ao-age {
  font-size: 9px;
  color: #4a6a8a;
  text-align: right;
}

.cancel-btn {
  background: none;
  border: none;
  color: #3a5a7a;
  font-size: 9px;
  cursor: pointer;
  padding: 0;
  line-height: 1;
  transition: color 0.15s;
}

.cancel-btn:hover {
  color: #ef4444;
}

.ao-empty {
  padding: 24px;
  text-align: center;
  font-size: 11px;
  color: #2a4a6a;
}

/* TransitionGroup */
.order-enter-active {
  transition: all 0.25s ease;
}

.order-leave-active {
  transition: all 0.2s ease;
  position: absolute;
  width: 100%;
}

.order-enter-from {
  opacity: 0;
  transform: translateX(-12px);
}

.order-leave-to {
  opacity: 0;
  transform: translateX(12px);
}
</style>