import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'

const routes: RouteRecordRaw[] = [
  { path: '/', redirect: '/feed' },
  { path: '/feed', name: 'Feed', component: () => import('../views/FeedView.vue') },
  { path: '/datasets', name: 'Datasets', component: () => import('../views/DatasetsView.vue') },
  { path: '/datasets/:id', name: 'DatasetDetail', component: () => import('../views/DatasetDetailView.vue'), props: true },
  { path: '/profile', name: 'Profile', component: () => import('../views/ProfileView.vue') },
  { path: '/settings', name: 'Settings', component: () => import('../views/SettingsView.vue') },
]

export const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior() {
    return { top: 0 }
  },
})

export default router

