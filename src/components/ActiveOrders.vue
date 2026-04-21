<template>
  <div
      :class="embedded ? 'h-100 d-flex flex-column overflow-hidden' : 'card bg-panel h-100 d-flex flex-column overflow-hidden'">
    <div v-if="!embedded" class="panel-header">
      <span class="micro-label text-info-emphasis">
        <i class="bi bi-list-check me-1"></i>ACTIVE ORDERS
      </span>
      <span class="badge bg-warning-subtle text-warning-emphasis border border-warning mono">
        {{ store.activeOrders.length }}
      </span>
    </div>

    <div class="col-head mono">
      <span>SIDE</span>
      <span>PRICE</span>
      <span class="text-end">QTY</span>
      <span class="text-end">AGE</span>
      <span></span>
    </div>

    <div class="flex-grow-1 overflow-auto">
      <TransitionGroup name="order">
        <div
            v-for="order in store.activeOrders"
            :key="order.id"
            :class="{ 'is-new': order.new }"
            class="ao-row mono"
        >
          <span :class="order.side === 'buy' ? 'chip chip-buy' : 'chip chip-sell'">
            {{ order.side === 'buy' ? 'B' : 'S' }}
          </span>
          <span class="small text-light">{{ order.price }}</span>
          <span class="small text-end text-info-emphasis">{{ order.quantity }}</span>
          <span class="small text-end text-secondary">{{ age(order.placedAt) }}</span>
          <button :disabled="cancelling.has(order.id)"
                  class="btn btn-sm btn-link p-0 text-secondary cancel-btn"
                  title="Cancel"
                  @click="cancel(order.id)">
            <i :class="cancelling.has(order.id) ? 'bi bi-hourglass-split' : 'bi bi-x-lg'"></i>
          </button>
        </div>
      </TransitionGroup>

      <div v-if="!store.activeOrders.length" class="text-center small text-secondary p-4">
        No active orders
      </div>
    </div>
  </div>
</template>

<script setup>
import {ref, onMounted, onUnmounted} from 'vue'
import {useTradingStore} from '../stores/trading.js'

defineProps({
  embedded: {type: Boolean, default: false},
})

const store = useTradingStore()
const cancelling = ref(new Set())

async function cancel(id) {
  if (cancelling.value.has(id)) return
  cancelling.value.add(id)
  await store.cancelActiveOrder(id)
  cancelling.value.delete(id)
}

function age(ts) {
  const s = Math.floor((Date.now() - ts) / 1000)
  if (s < 60) return s + 's'
  return Math.floor(s / 60) + 'm'
}

let timer = null
const tick = ref(0)
onMounted(() => {
  timer = setInterval(() => tick.value++, 1000)
})
onUnmounted(() => clearInterval(timer))
</script>

<style scoped>
.col-head {
  display: grid;
  grid-template-columns: 32px 1fr 1fr 40px 24px;
  gap: 0.25rem;
  padding: 0.25rem 0.75rem;
  border-bottom: 1px solid #121e2c;
  font-size: 0.625rem;
  font-weight: 600;
  color: #3a5a7a;
  letter-spacing: 0.1em;
}

.ao-row {
  display: grid;
  grid-template-columns: 32px 1fr 1fr 40px 24px;
  gap: 0.25rem;
  align-items: center;
  padding: 0.25rem 0.75rem;
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

.cancel-btn:hover {
  color: var(--sell) !important;
}

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
