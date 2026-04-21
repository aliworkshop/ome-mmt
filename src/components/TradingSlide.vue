<template>
  <div class="h-100 d-flex justify-content-center p-3">
    <div class="h-100 w-100">
      <MMTControls/>
    </div>
  </div>
</template>

<script setup>
import MMTControls from './MMTControls.vue'
</script>

<style scoped>
.controls-wrap {
  max-width: 520px;
  min-width: 0;
}
</style>
