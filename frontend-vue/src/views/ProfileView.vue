<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { getMe, type User } from '../lib/api'

const loading = ref(true)
const user = ref<User | null>(null)
const error = ref<string | null>(null)

async function load() {
  loading.value = true
  error.value = null
  try {
    user.value = await getMe()
  } catch (e: any) {
    error.value = e?.message || 'Failed to load profile'
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<template>
  <n-space vertical size="large">
    <n-page-header title="Profile" />
    <n-alert v-if="error" type="error">{{ error }}</n-alert>
    <div v-if="loading">
      <n-skeleton text :repeat="3" />
    </div>
    <n-card v-else>
      <n-space align="center">
        <n-avatar :size="64" :src="user?.avatar_url">{{ user?.name?.slice(0,2).toUpperCase() }}</n-avatar>
        <div>
          <div class="name">{{ user?.name }}</div>
          <div class="email">{{ user?.email }}</div>
          <div class="meta">{{ user?.job_title }} @ {{ user?.company }}</div>
        </div>
      </n-space>
    </n-card>
  </n-space>
</template>

<style scoped>
.name { font-weight: 600; }
.email { opacity: 0.7; }
.meta { opacity: 0.8; }
</style>

