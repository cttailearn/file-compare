<script setup lang="ts">
const props = defineProps<{
  total: number
  current: number
}>()

const emit = defineEmits<{
  (e: 'prev'): void
  (e: 'next'): void
}>()

const canPrev = () => props.total > 0 && props.current > 0
const canNext = () => props.total > 0 && props.current < props.total - 1
</script>

<template>
  <div class="bar">
    <div class="left">
      <div class="label">差异导航</div>
      <div class="meta" v-if="total > 0">{{ current + 1 }} / {{ total }}</div>
      <div class="meta" v-else>无差异</div>
    </div>
    <div class="right">
      <button type="button" class="btn" :disabled="!canPrev()" @click="emit('prev')">上一处</button>
      <button type="button" class="btn" :disabled="!canNext()" @click="emit('next')">下一处</button>
    </div>
  </div>
</template>

<style scoped>
.bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  border: 1px solid #e5e7eb;
  background: #ffffff;
  border-radius: 12px;
  padding: 10px 12px;
}

.left {
  display: flex;
  align-items: baseline;
  gap: 10px;
}

.label {
  font-weight: 700;
  color: #111827;
}

.meta {
  color: #6b7280;
  font-size: 12px;
}

.right {
  display: flex;
  gap: 8px;
}

.btn:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}
</style>

