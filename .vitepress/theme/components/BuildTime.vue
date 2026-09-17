<!-- .vitepress/theme/components/BuildTime.vue -->
<script setup lang="ts">
// 声明全局常量类型，避免 TS 报错
declare const __BUILD_TIME__: string

// 格式化时间显示
const buildTime = new Date(__BUILD_TIME__).toLocaleString('zh-CN', {
  timeZone: 'Asia/Shanghai',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
})
</script>

<template>
  <div class="build-time">v-{{ buildTime }}</div>
</template>

<style scoped>
.build-time {
  font-size: 0.85em;
  color: var(--vp-c-text-2);
  margin-right: 12px;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
}
</style>