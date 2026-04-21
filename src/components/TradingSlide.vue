<template>
  <div class="trading-layout p-3">
    <div class="charts-row">
      <PriceChart/>
      <DepthChart/>
    </div>
    <div class="controls-row">
      <MMTControls/>
    </div>
  </div>
</template>

<script setup>
import MMTControls from './MMTControls.vue'
import PriceChart from './PriceChart.vue'
import DepthChart from './DepthChart.vue'
</script>

<style scoped>
.trading-layout {
  display: flex;
  flex-direction: column;
  height: 100%;
  gap: 0.75rem;
  min-height: 0;
}

.charts-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
  height: 44%;
  min-height: 200px;
  flex-shrink: 0;
}

.controls-row {
  flex: 1;
  min-height: 0;
  display: flex;
  justify-content: center;
}

.controls-row > :deep(*) {
  width: 100%;
  max-width: 620px;
}

@media (max-width: 1100px) {
  .charts-row {
    grid-template-columns: 1fr;
    height: auto;
    min-height: 340px;
  }
}
</style>
