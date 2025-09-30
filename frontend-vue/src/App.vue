<script setup lang="ts">
import AppNav from './components/AppNav.vue'
import SidebarNav from './components/SidebarNav.vue'
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { darkTheme } from 'naive-ui'
import { isDarkActive } from './lib/theme'

const isDark = ref<boolean>(isDarkActive())

function onSchemeChanged(e: Event) {
  const ce = e as CustomEvent<{ scheme: string; isDark: boolean }>
  isDark.value = ce.detail?.isDark ?? isDarkActive()
}

onMounted(() => {
  window.addEventListener('db-scheme-changed', onSchemeChanged as EventListener)
})

onBeforeUnmount(() => {
  window.removeEventListener('db-scheme-changed', onSchemeChanged as EventListener)
})
</script>

<template>
  <n-config-provider :theme="isDark ? darkTheme : null">
    <div class="app-shell">
      <AppNav />
      <div class="layout">
        <SidebarNav />
        <main class="content">
          <RouterView />
        </main>
      </div>
    </div>
  </n-config-provider>
  <n-global-style />
</template>

<style scoped>
.app-shell {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}
.content {
  padding: 1rem;
  max-width: 1200px;
  margin: 0 auto;
  width: 100%;
}
.layout { display: grid; grid-template-columns: 260px 1fr; align-items: start; }
</style>
