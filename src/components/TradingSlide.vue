<template>
  <div class="trading-slide">
    <div class="col col-left">
      <OrderBook/>
    </div>
    <div class="col col-center">
      <MMTControls/>
    </div>
    <div class="col col-right">
      <LiveMatches/>
    </div>
  </div>
</template>

<script setup>
import OrderBook from './OrderBook.vue'
import MMTControls from './MMTControls.vue'
import LiveMatches from './LiveMatches.vue'
</script>

<style scoped>
.trading-slide {
  display: grid;
  grid-template-columns: 280px 1fr 280px;
  gap: 10px;
  height: 100%;
  padding: 10px;
}

.col {
  height: 100%;
  min-height: 0;
}

@media (max-width: 1100px) {
  .trading-slide {
    grid-template-columns: 240px 1fr 220px;
  }
}
</style>