<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { getDataset, getDatasetPreview, getDatasetEngagement, type Dataset } from '../lib/api'

const route = useRoute()
const id = ref<string>(route.params.id as string)

const loading = ref(true)
const dataset = ref<Dataset | null>(null)
const preview = ref<{ schema_sample: any[]; row_count: number | null; platform: string; data_type: string } | null>(null)
const engagement = ref<{ counts: { followers: number; likes: number }; recent_actors: Array<{ id: string; name: string; avatar_url: string }> } | null>(null)
const error = ref<string | null>(null)

async function load() {
  loading.value = true
  error.value = null
  try {
    const [d, p, e] = await Promise.all([
      getDataset(id.value),
      getDatasetPreview(id.value),
      getDatasetEngagement(id.value),
    ])
    dataset.value = d
    preview.value = p
    engagement.value = e
  } catch (err: any) {
    error.value = err?.message || 'Failed to load dataset'
  } finally {
    loading.value = false
  }
}

onMounted(load)
watch(() => route.params.id, (nv) => {
  id.value = nv as string
  load()
})
</script>

<template>
  <n-space vertical size="large">
    <n-page-header :title="dataset?.name || 'Dataset'" :subtitle="dataset?.id" @back="$router.back()" />

    <n-alert v-if="error" type="error">{{ error }}</n-alert>
    
    <div v-if="loading">
      <n-skeleton text :repeat="3" />
    </div>

    <div v-else>
      <n-grid :cols="3" :x-gap="16" :y-gap="16">
        <n-grid-item :span="2">
          <n-card title="About">
            <p>{{ dataset?.description || 'No description' }}</p>
            <n-space>
              <n-tag v-for="t in (dataset?.tags || [])" :key="t" size="small">{{ t }}</n-tag>
            </n-space>
          </n-card>
          <n-card title="Schema preview" style="margin-top: 16px">
            <n-empty v-if="!preview?.schema_sample?.length">No schema info</n-empty>
            <n-table v-else :single-line="false">
              <thead>
                <tr><th>Name</th><th>Type</th><th>Nullable</th></tr>
              </thead>
              <tbody>
                <tr v-for="c in preview?.schema_sample" :key="c.name">
                  <td>{{ c.name }}</td>
                  <td>{{ c.type_text || c.type || '' }}</td>
                  <td>{{ c.nullable ? 'Yes' : 'No' }}</td>
                </tr>
              </tbody>
            </n-table>
          </n-card>
        </n-grid-item>
        <n-grid-item>
          <n-card title="Engagement">
            <n-statistic label="Followers" :value="engagement?.counts.followers || 0" />
            <n-statistic label="Likes" :value="engagement?.counts.likes || 0" />
            <n-space align="center" style="margin-top: 8px">
              <n-avatar v-for="a in (engagement?.recent_actors || [])" :key="a.id" :src="a.avatar_url" :title="a.name" />
            </n-space>
          </n-card>
        </n-grid-item>
      </n-grid>
    </div>
  </n-space>
</template>

<style scoped>
</style>

