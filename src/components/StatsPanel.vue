<script setup lang="ts">
import type { ComparisonStats } from '../types/comparison'

defineProps<{
  stats: ComparisonStats
}>()
</script>

<template>
  <div class="panel">
    <div class="title">统计</div>
    <div class="grid">
      <div class="card">
        <div class="label">新增</div>
        <div class="value added">{{ stats.added }}</div>
      </div>
      <div class="card">
        <div class="label">删除</div>
        <div class="value deleted">{{ stats.deleted }}</div>
      </div>
      <div class="card">
        <div class="label">相同</div>
        <div class="value">{{ stats.unchanged }}</div>
      </div>
      <div class="card">
        <div class="label">相似度</div>
        <div class="value">{{ Math.round(stats.similarity * 100) }}%</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.panel {
  border: 1px solid #e5e7eb;
  background: #ffffff;
  border-radius: 12px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.title {
  font-weight: 700;
  color: #111827;
}

.grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
}

.card {
  border: 1px solid #eef2f7;
  border-radius: 10px;
  padding: 10px;
}

.label {
  font-size: 12px;
  color: #6b7280;
}

.value {
  font-size: 18px;
  font-weight: 700;
  color: #111827;
}

.value.added {
  color: #166534;
}

.value.deleted {
  color: #991b1b;
}

@media (max-width: 900px) {
  .grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>

