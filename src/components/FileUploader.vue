<script setup lang="ts">
import { computed, ref } from 'vue'

const props = defineProps<{
  label: string
  modelValue: File | null
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: File | null): void
  (e: 'error', message: string): void
}>()

const inputRef = ref<HTMLInputElement | null>(null)
const isDragging = ref(false)

const fileName = computed(() => props.modelValue?.name ?? '')
const fileSize = computed(() => props.modelValue?.size ?? 0)

function validateFile(file: File): string | null {
  const maxSize = 50 * 1024 * 1024
  if (file.size > maxSize) return '文件大小超过 50MB 限制'
  return null
}

function setFile(file: File | null) {
  if (!file) {
    emit('update:modelValue', null)
    return
  }
  const error = validateFile(file)
  if (error) {
    emit('error', error)
    return
  }
  emit('update:modelValue', file)
}

function onInputChange(e: Event) {
  const target = e.target as HTMLInputElement
  const file = target.files?.[0] ?? null
  setFile(file)
}

function openPicker() {
  inputRef.value?.click()
}

function clear() {
  if (inputRef.value) inputRef.value.value = ''
  setFile(null)
}

function onDrop(e: DragEvent) {
  e.preventDefault()
  isDragging.value = false
  const file = e.dataTransfer?.files?.[0] ?? null
  setFile(file)
}
</script>

<template>
  <div class="uploader">
    <div class="label">{{ label }}</div>
    <div
      class="dropzone"
      :class="{ dragging: isDragging }"
      @click="openPicker"
      @dragenter.prevent="isDragging = true"
      @dragover.prevent="isDragging = true"
      @dragleave.prevent="isDragging = false"
      @drop="onDrop"
    >
      <input
        ref="inputRef"
        class="input"
        type="file"
        accept=".txt,.md,.markdown,.json,.yaml,.yml,.xml,.xlsx,.xls,.docx,.pdf,.pptx,.js,.jsx,.ts,.tsx,.vue,.py,.java,.go,.rs,.c,.cc,.cpp,.h,.hpp,.cs,.html,.css,.scss,.less"
        @change="onInputChange"
      />
      <div v-if="!modelValue" class="hint">
        点击选择文件或拖拽到此处
      </div>
      <div v-else class="file">
        <div class="name">{{ fileName }}</div>
        <div class="meta">{{ Math.ceil(fileSize / 1024) }} KB</div>
        <button type="button" class="btn" @click.stop="clear">移除</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.uploader {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.label {
  font-weight: 600;
  color: #111827;
}

.dropzone {
  border: 1px dashed #cbd5e1;
  background: #ffffff;
  border-radius: 12px;
  padding: 16px;
  min-height: 108px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.dropzone.dragging {
  border-color: #2563eb;
  background: #eff6ff;
}

.input {
  display: none;
}

.hint {
  color: #6b7280;
  font-size: 14px;
}

.file {
  width: 100%;
  display: grid;
  grid-template-columns: 1fr auto auto;
  gap: 12px;
  align-items: center;
}

.name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-weight: 600;
}

.meta {
  color: #6b7280;
  font-size: 12px;
}

.btn {
  padding: 8px 10px;
}
</style>
