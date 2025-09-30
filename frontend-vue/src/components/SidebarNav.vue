<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { RouterLink } from 'vue-router'
import { getMe, type User } from '../lib/api'
import { HomeOutline, AlbumsOutline, PeopleOutline, LinkOutline, StarOutline, HeartOutline, ChevronBackOutline, ChevronForwardOutline } from '@vicons/ionicons5'

const COLLAPSE_KEY = 'db_ui_sidebar_collapsed'
const route = useRoute()

const collapsed = ref<boolean>(localStorage.getItem(COLLAPSE_KEY) === '1')
function toggleCollapse() {
  collapsed.value = !collapsed.value
  localStorage.setItem(COLLAPSE_KEY, collapsed.value ? '1' : '0')
}

const me = ref<User | null>(null)
onMounted(async () => {
  try { me.value = await getMe() } catch {}
})

type NavItem = { to: string; label: string; icon: any }
const navItems: NavItem[] = [
  { to: '/feed', label: 'Feed', icon: HomeOutline },
  { to: '/datasets', label: 'Datasets', icon: AlbumsOutline },
  { to: '/groups', label: 'Groups/Teams', icon: PeopleOutline },
  { to: '/connectors', label: 'Connectors', icon: LinkOutline },
  { to: '/favorites', label: 'Favorites', icon: StarOutline },
  { to: '/following', label: 'Following', icon: HeartOutline },
]
</script>

<template>
  <aside class="sidebar" :class="{ collapsed }">
    <div class="top">
      <button class="collapse" @click="toggleCollapse">
        <n-icon :size="18">
          <component :is="collapsed ? ChevronForwardOutline : ChevronBackOutline" />
        </n-icon>
      </button>
    </div>
    <nav class="menu">
      <RouterLink v-for="item in navItems" :key="item.to" :to="item.to" class="entry" :class="{ active: route.path.startsWith(item.to) }">
        <n-icon :size="18" class="icon"><component :is="item.icon" /></n-icon>
        <span class="label">{{ item.label }}</span>
      </RouterLink>
    </nav>

    <div class="spacer" />

    <RouterLink to="/profile" class="me" :title="me?.name || 'Profile'">
      <n-avatar :size="28" :src="me?.avatar_url">{{ (me?.name || 'U').slice(0,2).toUpperCase() }}</n-avatar>
      <div class="me-info">
        <div class="name">{{ me?.name || '—' }}</div>
        <div class="role">{{ me?.job_title || me?.company || '' }}</div>
      </div>
    </RouterLink>
  </aside>
  
</template>

<style scoped>
.sidebar {
  position: sticky;
  top: 0;
  align-self: start;
  height: 100vh;
  border-right: 1px solid var(--border-color);
  width: 240px;
  padding: 0.75rem 0.5rem;
  display: flex;
  flex-direction: column;
  background: var(--bg-surface);
}
.sidebar.collapsed { width: 72px; }
.top { display: flex; justify-content: flex-end; padding: 0 0.25rem 0.5rem 0.25rem; }
.collapse { background: transparent; border: none; cursor: pointer; color: inherit; }
.menu { display: flex; flex-direction: column; gap: 4px; }
.entry { display: flex; gap: 10px; align-items: center; padding: 8px 10px; border-radius: 8px; color: inherit; text-decoration: none; }
.entry:hover { background: color-mix(in oklab, var(--bg-surface), #000 6%); opacity: 1; }
.entry.active { background: color-mix(in oklab, var(--bg-surface), #000 10%); opacity: 1; }
.icon { width: 20px; display: inline-flex; justify-content: center; }
.label { white-space: nowrap; }
.sidebar.collapsed .label { display: none; }
.spacer { flex: 1; }
.me { display: flex; align-items: center; gap: 10px; padding: 8px 10px; border-radius: 8px; text-decoration: none; color: inherit; }
.me:hover { background: rgba(0,0,0,0.05); }
.sidebar.collapsed .me-info { display: none; }
.name { font-size: 13px; }
.role { color: var(--text-muted); font-size: 12px; }

/* Dark mode tweaks */
:root[data-theme="dark"] .entry:hover { background: color-mix(in oklab, var(--bg-surface), #fff 6%); }
:root[data-theme="dark"] .entry.active { background: color-mix(in oklab, var(--bg-surface), #fff 10%); }
:root[data-theme="dark"] .me:hover { background: color-mix(in oklab, var(--bg-surface), #fff 6%); }
</style>


