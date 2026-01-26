<script setup lang="ts">
import { nextTick, ref, watch } from 'vue'
import type { DiffLine } from '../types/comparison'

const props = defineProps<{
  lines: DiffLine[]
  activeDiffIndex: number | null
  leftTitle?: string
  rightTitle?: string
}>()

const containerRef = ref<HTMLDivElement | null>(null)
const rowRefs = new Map<number, HTMLElement>()

function setRowRef(index: number, el: unknown) {
  if (!el) {
    rowRefs.delete(index)
    return
  }
  if (el instanceof HTMLElement) rowRefs.set(index, el)
}

async function scrollToLineIndex(index: number) {
  await nextTick()
  const el = rowRefs.get(index)
  const container = containerRef.value
  if (!el || !container) return
  const top = el.offsetTop - container.clientHeight / 2 + el.clientHeight / 2
  container.scrollTo({ top: Math.max(0, top), behavior: 'smooth' })
}

watch(
  () => props.activeDiffIndex,
  (idx) => {
    if (idx === null) return
    scrollToLineIndex(idx)
  },
)

defineExpose({ scrollToLineIndex })
</script>

<template>
  <div ref="containerRef" class="viewer">
    <div class="header">
      <div class="cell left">{{ props.leftTitle ?? '文件 A' }}</div>
      <div class="cell right">{{ props.rightTitle ?? '文件 B' }}</div>
    </div>
    <div
      v-for="line in lines"
      :key="line.index"
      class="row"
      :class="{ active: activeDiffIndex === line.index }"
      :ref="(el) => setRowRef(line.index, el)"
      :data-index="line.index"
    >
      <div class="cell left" :class="line.type">
        <pre class="code">{{ line.left ?? '' }}</pre>
      </div>
      <div class="cell right" :class="line.type">
        <pre class="code">{{ line.right ?? '' }}</pre>
      </div>
    </div>
  </div>
</template>

<style scoped>
.viewer {
  border: 1px solid #e5e7eb;
  background: #ffffff;
  border-radius: 12px;
  overflow: auto;
  max-height: 62vh;
  -webkit-overflow-scrolling: touch;
  overscroll-behavior: contain;
}

.header {
  display: grid;
  grid-template-columns: minmax(360px, 1fr) minmax(360px, 1fr);
  position: sticky;
  top: 0;
  background: #ffffff;
  border-bottom: 1px solid #e5e7eb;
  z-index: 1;
}

.row {
  display: grid;
  grid-template-columns: minmax(360px, 1fr) minmax(360px, 1fr);
  border-bottom: 1px solid #f1f5f9;
}

.row.active {
  outline: 2px solid #2563eb;
  outline-offset: -2px;
}

.cell {
  padding: 8px 10px;
  border-right: 1px solid #f1f5f9;
  overflow: hidden;
  min-width: 0;
}

.cell:last-child {
  border-right: none;
}

.cell.added {
  background: #ecfdf5;
}

.cell.deleted {
  background: #fef2f2;
}

.cell.unchanged {
  background: #ffffff;
}

.code {
  margin: 0;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New',
    monospace;
  font-size: 12px;
  line-height: 1.55;
  white-space: pre;
  overflow-x: auto;
  overflow-y: hidden;
  max-width: 100%;
}

.header .cell {
  font-weight: 700;
  font-size: 12px;
  color: #111827;
  white-space: nowrap;
  text-overflow: ellipsis;
}

@media (max-width: 900px) {
  .viewer {
    scroll-snap-type: x proximity;
  }

  .header,
  .row {
    grid-template-columns: 100% 100%;
  }

  .cell {
    scroll-snap-align: start;
  }
}
</style>
