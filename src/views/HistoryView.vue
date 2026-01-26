<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { comparisonState } from '../store/comparisonStore'
import type { ComparisonResult } from '../types/comparison'
import { clearHistory, loadHistory } from '../utils/history'

const router = useRouter()
const refreshKey = ref(0)

const history = computed<ComparisonResult[]>(() => {
  refreshKey.value
  return loadHistory()
})

function formatTime(ts: number): string {
  const d = new Date(ts)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(
    d.getSeconds(),
  )}`
}

async function open(item: ComparisonResult) {
  comparisonState.result = item
  comparisonState.status = 'done'
  comparisonState.error = null
  comparisonState.config = { ...item.config }
  await router.push('/')
}

function onClear() {
  clearHistory()
  refreshKey.value += 1
}
</script>

<template>
  <div class="page">
    <div class="top">
      <div>
        <div class="title">比对历史</div>
        <div class="desc">仅保存在本机浏览器存储</div>
      </div>
      <button type="button" @click="onClear" :disabled="history.length === 0">清空历史</button>
    </div>

    <div v-if="history.length === 0" class="empty">暂无记录</div>

    <div v-else class="list">
      <div v-for="item in history" :key="item.id" class="item">
        <div class="main">
          <div class="name">{{ item.fileA.name }} ⇄ {{ item.fileB.name }}</div>
          <div class="meta">
            <span>{{ formatTime(item.createdAt) }}</span>
            <span>相似度 {{ Math.round(item.stats.similarity * 100) }}%</span>
            <span>新增 {{ item.stats.added }}</span>
            <span>删除 {{ item.stats.deleted }}</span>
          </div>
        </div>
        <button type="button" class="open" @click="open(item)">查看</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.page {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.top {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 10px;
}

.title {
  font-size: 22px;
  font-weight: 800;
  color: #111827;
}

.desc {
  color: #6b7280;
  font-size: 13px;
}

.empty {
  border: 1px solid #e5e7eb;
  background: #ffffff;
  border-radius: 12px;
  padding: 24px;
  text-align: center;
  color: #6b7280;
}

.list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.item {
  border: 1px solid #e5e7eb;
  background: #ffffff;
  border-radius: 12px;
  padding: 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.name {
  font-weight: 700;
  color: #111827;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.meta {
  display: flex;
  gap: 12px;
  color: #6b7280;
  font-size: 12px;
  flex-wrap: wrap;
}

.open {
  white-space: nowrap;
}
</style>

