<script setup lang="ts">
import { onBeforeMount, ref } from 'vue'

const offlineReady = ref(false)

function onOfflineReady() {
  offlineReady.value = true
  // 可以在这里加一个简单的提示，或直接设为 true 让 UI 显示
  setTimeout(() => { offlineReady.value = false }, 3000)
}

onBeforeMount(async () => {
  const { registerSW } = await import('virtual:pwa-register')
  registerSW({
    immediate: true,
    onOfflineReady,
    onRegistered() {
      console.info('Service Worker registered')
    },
    onRegisterError(e:any) {
      console.error('SW registration error!', e)
    },
  })
})
</script>

<template>
  <div v-if="offlineReady" class="pwa-toast" role="alert">
    App ready to work offline
  </div>
</template>

<style>
.pwa-toast {
  position: fixed;
  right: 16px;
  bottom: 16px;
  padding: 10px 16px;
  border-radius: 6px;
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
  box-shadow: 0 4px 12px rgba(0,0,0,.1);
  font-size: 13px;
  z-index: 100;
}
</style>