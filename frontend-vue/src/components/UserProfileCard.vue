<script setup lang="ts">
import type { User } from '../lib/api'
defineProps<{ user: User | null, loading?: boolean }>()
</script>

<template>
  <n-card size="small" :segmented="{ content: true, footer: 'soft' }">
    <template #header>
      <div style="display:flex;align-items:center;gap:8px">
        <n-skeleton v-if="loading" circle :width="36" :height="36" />
        <n-avatar v-else :src="user?.avatar_url" :size="36">{{ (user?.name || 'U').slice(0,2).toUpperCase() }}</n-avatar>
        <div>
          <div>
            <n-skeleton v-if="loading" text style="width:120px" />
            <span v-else>{{ user?.name || '—' }}</span>
          </div>
          <div style="opacity:0.7;font-size:12px">
            <n-skeleton v-if="loading" text style="width:160px" />
            <span v-else>{{ user?.email }}</span>
          </div>
        </div>
      </div>
    </template>
    <template #footer>
      <div style="display:flex;gap:8px">
        <RouterLink to="/profile">
          <n-button size="small">View profile</n-button>
        </RouterLink>
        <RouterLink to="/settings">
          <n-button size="small" tertiary type="primary">Settings</n-button>
        </RouterLink>
      </div>
    </template>
    <div style="font-size:13px;opacity:0.8">
      <slot />
    </div>
  </n-card>
</template>

<style scoped>
</style>


