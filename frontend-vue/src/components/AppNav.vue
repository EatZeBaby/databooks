<script setup lang="ts">
import { RouterLink, useRoute } from 'vue-router'
const route = useRoute()
const links = [
  { to: '/feed', label: 'Feed' },
  { to: '/datasets', label: 'Datasets' },
  { to: '/profile', label: 'Profile' },
  { to: '/settings', label: 'Settings' },
]
const appName = (import.meta.env.VITE_APP_NAME as string) || 'Databooks'
</script>

<template>
  <header class="nav">
    <div class="brand">{{ appName }}</div>
    <nav>
      <RouterLink v-for="l in links" :key="l.to" :to="l.to" class="link" :class="{ active: route.path.startsWith(l.to) }">
        {{ l.label }}
      </RouterLink>
    </nav>
  </header>
</template>

<style scoped>
.nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid var(--border-color);
}
.brand {
  font-weight: 700;
}
nav {
  display: flex;
  gap: 1rem;
}
.link { text-decoration: none; color: inherit; }
.link.active { border-bottom: 2px solid currentColor; }
</style>

