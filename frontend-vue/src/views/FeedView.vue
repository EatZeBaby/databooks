<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { getFeed, getMe, type EventItem, type User } from '../lib/api'
import UserProfileCard from '../components/UserProfileCard.vue'

const loading = ref(true)
const events = ref<EventItem[]>([])
const error = ref<string | null>(null)

const me = ref<User | null>(null)
const meLoading = ref(true)
const meError = ref<string | null>(null)

async function loadFeed() {
  loading.value = true
  error.value = null
  try {
    const res = await getFeed(50)
    events.value = res.data
  } catch (e: any) {
    error.value = e?.message || 'Failed to load feed'
  } finally {
    loading.value = false
  }
}

async function loadMe() {
  meLoading.value = true
  meError.value = null
  try {
    me.value = await getMe()
  } catch (e: any) {
    meError.value = e?.message || 'Failed to load profile'
  } finally {
    meLoading.value = false
  }
}

onMounted(() => {
  void Promise.all([loadFeed(), loadMe()])
})
</script>

<template>
  <n-space vertical size="large">
    <div class="feed-layout">
      <aside class="left">
        <UserProfileCard :user="me" :loading="meLoading">
          <n-alert v-if="meError" type="warning" :show-icon="false">{{ meError }}</n-alert>
        </UserProfileCard>
      </aside>

      <section class="center">
        <n-alert v-if="error" type="error" :title="'Error'">{{ error }}</n-alert>

        <div v-if="loading">
          <n-skeleton text :repeat="3" />
        </div>

        <n-list v-else>
          <n-list-item v-for="ev in events" :key="ev.id">
            <n-thing :title="(typeof ev.payload_json?.human_text === 'string' ? ev.payload_json?.human_text : '') || ev.type" :description="new Date(ev.created_at).toLocaleString()">
              <template #avatar>
                <n-avatar :size="36">{{ (ev.actor_id || 'U').slice(0,2).toUpperCase() }}</n-avatar>
              </template>
              <template #action>
                <RouterLink v-if="ev.dataset_id" :to="`/datasets/${ev.dataset_id}`">View dataset</RouterLink>
              </template>
            </n-thing>
          </n-list-item>
        </n-list>
      </section>
    </div>
  </n-space>
</template>

<style scoped>
.feed-layout {
  display: grid;
  grid-template-columns: 280px 1fr;
  gap: 1rem;
}
.left { position: sticky; top: 1rem; align-self: start; height: max-content; }
.center { min-width: 0; }
</style>

