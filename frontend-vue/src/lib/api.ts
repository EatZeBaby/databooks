import axios from 'axios'
import type { AxiosInstance } from 'axios'

const API_BASE = (import.meta.env.VITE_API_BASE as string) || '/api/v1'

function createClient(): AxiosInstance {
  const instance = axios.create({
    baseURL: API_BASE,
    timeout: 15000,
  })
  return instance
}

export const http = createClient()

// Types (minimal)
export interface EventItem {
  id: string
  type: string
  payload_json?: Record<string, unknown>
  actor_id?: string
  dataset_id?: string | null
  created_at: string
}

export interface PaginatedEvents {
  cursor: string | null
  data: EventItem[]
}

export interface Dataset {
  id: string
  name: string
  description?: string
  tags?: string[]
  owner_id?: string
  org_id?: string
  source_type?: string
  source_metadata_json?: Record<string, unknown>
  visibility?: string
  created_at?: string
  updated_at?: string
}

export interface PaginatedDatasets {
  page: number
  per_page: number
  total: number
  data: Dataset[]
}

export interface User {
  id: string
  name: string
  email: string
  avatar_url?: string
  tools?: string[]
  job_title?: string
  company?: string
  subsidiary?: string
}

export async function getFeed(limit = 50) {
  const { data } = await http.get<PaginatedEvents>('/feed', { params: { limit } })
  return data
}

export async function listDatasets(params: { query?: string; page?: number; per_page?: number } = {}) {
  const { data } = await http.get<PaginatedDatasets>('/datasets', { params })
  return data
}

export async function getDataset(id: string) {
  const { data } = await http.get<Dataset>(`/datasets/${id}`)
  return data
}

export async function getDatasetPreview(id: string) {
  const { data } = await http.get(`/datasets/${id}/preview`)
  return data as { schema_sample: any[]; row_count: number | null; platform: string; data_type: string }
}

export async function getDatasetEngagement(id: string) {
  const { data } = await http.get(`/datasets/${id}/engagement`)
  return data as { counts: { followers: number; likes: number }; recent_actors: Array<{ id: string; name: string; avatar_url: string }> }
}

export async function getMe() {
  const { data } = await http.get<User>('/users/me')
  return data
}

