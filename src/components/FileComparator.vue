<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { comparisonState } from '../store/comparisonStore'
import type { ComparisonResult } from '../types/comparison'
import { detectFileKind, parseFile } from '../utils/fileParser'
import { getChangedLineIndices } from '../utils/diffEngine'
import { saveToHistory } from '../utils/history'
import { compareFilesInWorker } from '../utils/workerCompare'
import DiffViewer from './DiffViewer.vue'
import FileUploader from './FileUploader.vue'
import NavigationBar from './NavigationBar.vue'
import StatsPanel from './StatsPanel.vue'
import VueOfficeDocx from '@vue-office/docx'
import VueOfficeExcel from '@vue-office/excel'
import VueOfficePdf from '@vue-office/pdf'
import VueOfficePptx from '@vue-office/pptx'
import '@vue-office/docx/lib/index.css'
import '@vue-office/excel/lib/index.css'

const fileA = ref<File | null>(null)
const fileB = ref<File | null>(null)

const diffViewerRef = ref<InstanceType<typeof DiffViewer> | null>(null)

type OfficePreviewKind = 'excel' | 'word' | 'pdf' | 'pptx'
type PreviewState = {
  kind: OfficePreviewKind | null
  status: 'idle' | 'loading' | 'ready' | 'error'
  src: ArrayBuffer | null
  error: string | null
}

const activeView = ref<'compare' | 'preview'>('compare')
const showOnlyChanges = ref(false)

const previewA = ref<PreviewState>({ kind: null, status: 'idle', src: null, error: null })
const previewB = ref<PreviewState>({ kind: null, status: 'idle', src: null, error: null })

const hasAnyPreview = computed(() => previewA.value.kind !== null || previewB.value.kind !== null)

const displayLines = computed(() => {
  const result = comparisonState.result
  if (!result) return []
  if (!showOnlyChanges.value) return result.lines
  return result.lines.filter((x) => x.type !== 'unchanged')
})

const statusLabel = computed(() => {
  const s = comparisonState.status
  if (s === 'idle') return '就绪'
  if (s === 'reading') return '读取中'
  if (s === 'parsing') return '解析中'
  if (s === 'comparing') return '比对中'
  if (s === 'done') return '完成'
  return '出错'
})

function resetPreview(target: typeof previewA) {
  target.value.kind = null
  target.value.status = 'idle'
  target.value.src = null
  target.value.error = null
}

async function loadPreview(file: File | null, target: typeof previewA) {
  if (!file) {
    resetPreview(target)
    return
  }

  const kind = detectFileKind(file)
  if (kind !== 'excel' && kind !== 'word' && kind !== 'pdf' && kind !== 'pptx') {
    resetPreview(target)
    return
  }

  target.value.kind = kind
  target.value.status = 'loading'
  target.value.src = null
  target.value.error = null

  try {
    const buf = await file.arrayBuffer()
    if (file !== (target === previewA ? fileA.value : fileB.value)) return
    target.value.src = buf
    target.value.status = 'ready'
  } catch (e) {
    const message = e instanceof Error ? e.message : '预览失败'
    target.value.status = 'error'
    target.value.error = message
  }
}

watch(fileA, (f) => loadPreview(f, previewA), { immediate: true })
watch(fileB, (f) => loadPreview(f, previewB), { immediate: true })

onBeforeUnmount(() => {
  resetPreview(previewA)
  resetPreview(previewB)
})

const changedIndices = computed(() => {
  const result = comparisonState.result
  if (!result) return []
  return getChangedLineIndices(result.lines)
})

const activePos = ref(0)
const activeLineIndex = computed(() => {
  if (changedIndices.value.length === 0) return null
  return changedIndices.value[Math.min(activePos.value, changedIndices.value.length - 1)] ?? null
})

function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function setError(message: string) {
  comparisonState.error = message
  comparisonState.status = 'error'
}

async function startCompare() {
  comparisonState.error = null
  comparisonState.result = null

  if (!fileA.value || !fileB.value) {
    setError('请先选择两个文件')
    return
  }

  try {
    comparisonState.status = 'reading'
    const [parsedA, parsedB] = await Promise.all([parseFile(fileA.value), parseFile(fileB.value)])
    comparisonState.status = 'parsing'

    if (parsedA.kind === 'pptx' || parsedB.kind === 'pptx') {
      setError('PPTX 仅支持预览，暂不支持文本比对')
      return
    }

    if (parsedA.kind === 'unsupported' || parsedB.kind === 'unsupported') {
      setError('不支持的文件类型：请使用文本/Markdown/JSON/YAML/XML/Excel(xlsx)/Word(docx)/PDF/PPTX(pptx)')
      return
    }

    comparisonState.status = 'comparing'
    const payload = await compareFilesInWorker({
      textA: parsedA.text,
      textB: parsedB.text,
      config: { ...comparisonState.config },
    })

    const result: ComparisonResult = {
      id: newId(),
      createdAt: Date.now(),
      fileA: { name: parsedA.name, size: parsedA.size },
      fileB: { name: parsedB.name, size: parsedB.size },
      config: { ...comparisonState.config },
      lines: payload.lines,
      stats: payload.stats,
    }

    comparisonState.result = result
    comparisonState.status = 'done'

    saveToHistory(result)

    activePos.value = 0
    if (changedIndices.value.length > 0) {
      await diffViewerRef.value?.scrollToLineIndex(changedIndices.value[0] ?? 0)
    }
  } catch (e) {
    const message = e instanceof Error ? e.message : '比对失败'
    setError(message)
  }
}

function goPrev() {
  if (changedIndices.value.length === 0) return
  activePos.value = Math.max(0, activePos.value - 1)
}

function goNext() {
  if (changedIndices.value.length === 0) return
  activePos.value = Math.min(changedIndices.value.length - 1, activePos.value + 1)
}
</script>

<template>
  <div class="wrap">
    <div class="top">
      <div class="uploaders">
        <FileUploader v-model="fileA" label="文件 A" @error="setError" />
        <FileUploader v-model="fileB" label="文件 B" @error="setError" />
      </div>

      <div class="config">
        <div class="configTitle">比对配置</div>
        <label class="option">
          <input type="checkbox" v-model="comparisonState.config.ignoreWhitespace" />
          忽略空白差异
        </label>
        <label class="option">
          <input type="checkbox" v-model="comparisonState.config.ignoreEmptyLines" />
          忽略空行
        </label>
        <label class="option">
          <input type="checkbox" v-model="comparisonState.config.caseSensitive" />
          大小写敏感
        </label>

        <div class="actions">
          <button type="button" class="primary" @click="startCompare" :disabled="comparisonState.status === 'comparing'">
            开始比对
          </button>
          <div class="status" v-if="comparisonState.status !== 'idle'">
            {{ comparisonState.status }}
          </div>
        </div>
      </div>
    </div>

    <div class="switch">
      <button type="button" class="seg" :class="{ active: activeView === 'compare' }" @click="activeView = 'compare'">
        比对
      </button>
      <button
        type="button"
        class="seg"
        :class="{ active: activeView === 'preview' }"
        :disabled="!hasAnyPreview"
        @click="activeView = 'preview'"
      >
        预览
      </button>
    </div>

    <div v-if="activeView === 'compare'">
      <div class="compareTop">
        <div class="files">
          <div class="fileChip">
            <div class="dot a" />
            <div class="fileName">{{ fileA?.name ?? '未选择文件 A' }}</div>
          </div>
          <div class="fileChip">
            <div class="dot b" />
            <div class="fileName">{{ fileB?.name ?? '未选择文件 B' }}</div>
          </div>
        </div>
        <div class="compareMeta">
          <div class="badge">{{ statusLabel }}</div>
          <label class="toggle" v-if="comparisonState.result">
            <input type="checkbox" v-model="showOnlyChanges" />
            仅显示差异
          </label>
        </div>
      </div>

      <div v-if="comparisonState.error" class="error">
        {{ comparisonState.error }}
      </div>

      <div v-if="comparisonState.status === 'idle' && !comparisonState.result && !comparisonState.error" class="emptyCompare">
        选择两个文件，点击“开始比对”
      </div>

      <div v-if="comparisonState.result" class="result">
        <div class="resultGrid">
          <NavigationBar
            :total="changedIndices.length"
            :current="activePos"
            @prev="goPrev"
            @next="goNext"
          />
          <StatsPanel :stats="comparisonState.result.stats" />
        </div>
        <DiffViewer
          ref="diffViewerRef"
          :lines="displayLines"
          :active-diff-index="activeLineIndex"
          :left-title="comparisonState.result?.fileA.name ?? fileA?.name ?? '文件 A'"
          :right-title="comparisonState.result?.fileB.name ?? fileB?.name ?? '文件 B'"
        />
      </div>
    </div>

    <div v-else class="previews">
      <div class="preview">
        <div class="previewTop">
          <div class="previewTitle">文件 A</div>
          <div class="previewName">{{ fileA?.name ?? '未选择' }}</div>
        </div>
        <div class="previewBody">
          <div v-if="!fileA" class="placeholder">请选择文件</div>
          <div v-else-if="previewA.status === 'loading'" class="placeholder">加载中…</div>
          <div v-else-if="previewA.status === 'error'" class="placeholder">预览失败：{{ previewA.error }}</div>
          <div v-else-if="previewA.kind === null" class="placeholder">该文件类型暂不支持预览</div>
          <VueOfficeExcel
            v-else-if="previewA.kind === 'excel' && previewA.src"
            :src="previewA.src"
            class="office"
          />
          <VueOfficeDocx
            v-else-if="previewA.kind === 'word' && previewA.src"
            :src="previewA.src"
            class="office"
          />
          <VueOfficePdf
            v-else-if="previewA.kind === 'pdf' && previewA.src"
            :src="previewA.src"
            class="office"
          />
          <VueOfficePptx
            v-else-if="previewA.kind === 'pptx' && previewA.src"
            :src="previewA.src"
            class="office"
          />
          <div v-else class="placeholder">预览初始化失败</div>
        </div>
      </div>

      <div class="preview">
        <div class="previewTop">
          <div class="previewTitle">文件 B</div>
          <div class="previewName">{{ fileB?.name ?? '未选择' }}</div>
        </div>
        <div class="previewBody">
          <div v-if="!fileB" class="placeholder">请选择文件</div>
          <div v-else-if="previewB.status === 'loading'" class="placeholder">加载中…</div>
          <div v-else-if="previewB.status === 'error'" class="placeholder">预览失败：{{ previewB.error }}</div>
          <div v-else-if="previewB.kind === null" class="placeholder">该文件类型暂不支持预览</div>
          <VueOfficeExcel
            v-else-if="previewB.kind === 'excel' && previewB.src"
            :src="previewB.src"
            class="office"
          />
          <VueOfficeDocx
            v-else-if="previewB.kind === 'word' && previewB.src"
            :src="previewB.src"
            class="office"
          />
          <VueOfficePdf
            v-else-if="previewB.kind === 'pdf' && previewB.src"
            :src="previewB.src"
            class="office"
          />
          <VueOfficePptx
            v-else-if="previewB.kind === 'pptx' && previewB.src"
            :src="previewB.src"
            class="office"
          />
          <div v-else class="placeholder">预览初始化失败</div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.wrap {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.top {
  display: grid;
  grid-template-columns: 1.2fr 0.8fr;
  gap: 12px;
}

.uploaders {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.config {
  border: 1px solid #e5e7eb;
  background: #ffffff;
  border-radius: 12px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.configTitle {
  font-weight: 700;
  color: #111827;
  margin-bottom: 6px;
}

.option {
  display: flex;
  align-items: center;
  gap: 10px;
  color: #111827;
  font-size: 14px;
}

.actions {
  margin-top: 10px;
  display: flex;
  align-items: center;
  gap: 10px;
}

.primary {
  border-color: #2563eb;
  background: #2563eb;
  color: #ffffff;
}

.primary:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.status {
  font-size: 12px;
  color: #6b7280;
}

.error {
  border: 1px solid #fecaca;
  background: #fef2f2;
  color: #991b1b;
  border-radius: 12px;
  padding: 10px 12px;
}

.switch {
  display: inline-flex;
  width: fit-content;
  border: 1px solid #e5e7eb;
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(10px);
  border-radius: 999px;
  padding: 4px;
  gap: 4px;
}

.seg {
  border: 1px solid transparent;
  padding: 8px 12px;
  border-radius: 999px;
  font-size: 13px;
  color: #334155;
  background: transparent;
}

.seg.active {
  background: #ffffff;
  border-color: #e5e7eb;
  color: #111827;
}

.seg:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.compareTop {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 10px 12px;
  border: 1px solid rgba(148, 163, 184, 0.35);
  background: rgba(255, 255, 255, 0.75);
  backdrop-filter: blur(10px);
  border-radius: 12px;
}

.files {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.fileChip {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
  border: 1px solid rgba(148, 163, 184, 0.35);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.8);
  min-width: 0;
}

.dot {
  width: 8px;
  height: 8px;
  border-radius: 99px;
  flex: none;
}

.dot.a {
  background: #2563eb;
}

.dot.b {
  background: #22c55e;
}

.fileName {
  font-size: 12px;
  color: #0f172a;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 34vw;
}

.compareMeta {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: none;
}

.badge {
  font-size: 12px;
  padding: 6px 10px;
  border-radius: 999px;
  border: 1px solid rgba(148, 163, 184, 0.35);
  background: rgba(255, 255, 255, 0.8);
  color: #334155;
}

.toggle {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: #334155;
  user-select: none;
}

.toggle input {
  accent-color: #2563eb;
}

.emptyCompare {
  border: 1px solid rgba(148, 163, 184, 0.35);
  background: rgba(255, 255, 255, 0.8);
  border-radius: 12px;
  padding: 18px 12px;
  text-align: center;
  color: #64748b;
  font-size: 13px;
}

.resultGrid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 12px;
}

.result {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.previews {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.preview {
  border: 1px solid #e5e7eb;
  background: #ffffff;
  border-radius: 12px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  min-height: 62vh;
}

.previewTop {
  display: flex;
  gap: 10px;
  align-items: center;
  padding: 10px 12px;
  border-bottom: 1px solid #eef2f7;
  background: #fbfdff;
}

.previewTitle {
  font-weight: 700;
  color: #111827;
  white-space: nowrap;
}

.previewName {
  color: #64748b;
  font-size: 12px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.previewBody {
  flex: 1;
  overflow: auto;
}

.placeholder {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #6b7280;
  font-size: 13px;
  padding: 24px;
  text-align: center;
}

.office {
  height: 62vh;
  width: 100%;
}

@media (max-width: 1000px) {
  .top {
    grid-template-columns: 1fr;
  }
  .uploaders {
    grid-template-columns: 1fr;
  }
  .previews {
    display: flex;
    overflow-x: auto;
    gap: 12px;
    scroll-snap-type: x proximity;
    -webkit-overflow-scrolling: touch;
  }
  .preview {
    min-width: 100%;
    scroll-snap-align: start;
  }
  .compareTop {
    flex-direction: column;
    align-items: stretch;
  }
  .files {
    flex-direction: column;
    align-items: stretch;
  }
  .fileName {
    max-width: 100%;
  }
}
</style>
