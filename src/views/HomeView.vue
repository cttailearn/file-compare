<script setup lang="ts">
import FileComparator from '../components/FileComparator.vue'
</script>

<template>
  <div class="page">
    <div class="title">文件比对</div>
    <div class="desc">本地浏览器内完成解析与比对，不上传文件</div>
    <FileComparator />
  </div>
</template>

<style scoped>
.page {
  display: flex;
  flex-direction: column;
  gap: 12px;
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
</style>

