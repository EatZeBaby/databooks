<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { listDatasets, type Dataset } from '../lib/api'

const loading = ref(true)
const datasets = ref<Dataset[]>([])
const total = ref(0)
const page = ref(1)
const perPage = ref(20)
const query = ref('')
const error = ref<string | null>(null)

async function load() {
  loading.value = true
  error.value = null
  try {
    const res = await listDatasets({ query: query.value || undefined, page: page.value, per_page: perPage.value })
    datasets.value = res.data
    total.value = res.total
  } catch (e: any) {
    error.value = e?.message || 'Failed to load datasets'
  } finally {
    loading.value = false
  }
}

onMounted(load)
watch([page, perPage], load)

function onSearch() {
  page.value = 1
  load()
}
</script>

<template>
  <n-space vertical size="large">
    <n-page-header title="Datasets" subtitle="Search and browse" />
    <n-space>
      <n-input v-model:value="query" placeholder="Search datasets..." style="max-width: 360px" @keydown.enter="onSearch" />
      <n-button type="primary" @click="onSearch">Search</n-button>
    </n-space>

    <n-alert v-if="error" type="error" :title="'Error'">{{ error }}</n-alert>

    <div v-if="loading">
      <n-skeleton text :repeat="3" />
    </div>

    <n-grid v-else :cols="3" :x-gap="16" :y-gap="16">
      <n-grid-item v-for="d in datasets" :key="d.id">
        <n-card :title="d.name">
          <template #header-extra>
            <n-tag size="small">{{ d.visibility || 'public' }}</n-tag>
          </template>
          <div class="desc">{{ d.description || 'No description' }}</div>
          <template #action>
            <RouterLink :to="`/datasets/${d.id}`">
              <n-button size="small">Open</n-button>
            </RouterLink>
          </template>
        </n-card>
      </n-grid-item>
    </n-grid>

    <n-space justify="center" v-if="total > perPage">
      <n-pagination v-model:page="page" :page-size="perPage" :item-count="total" />
    </n-space>
  </n-space>
  
</template>

<style scoped>
.desc {
  color: rgba(0,0,0,0.65);
}
</style>

