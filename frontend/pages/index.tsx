import useSWR from 'swr'
import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { apiGet, apiPost } from '@/lib/api'
import type { PaginatedDatasets } from '@/types/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs } from '@/components/Tabs'
import { motion, AnimatePresence } from 'framer-motion'
import { useToast } from '@/components/Toast'
import PlatformBadge from '@/components/PlatformBadge'
import Head from 'next/head'

type Event = { id: string; type: string; created_at: string; payload_json: Record<string, unknown>; dataset_id?: string }
type Me = { id: string; name: string; avatar_url?: string; job_title?: string; company?: string; tools?: string[]; role?: string }

function DatasetInlinePreview({ datasetId }: { datasetId: string }) {
  const { data } = useSWR<any>(`/api/v1/datasets/${datasetId}/preview`, apiGet)
  if (!data) return <div className="text-xs text-gray-500">Loading preview…</div>
  const cols = (data.schema_sample || []).slice(0,5)
  return (
    <div className="bg-white border rounded p-3 overflow-x-auto">
      <div className="text-xs text-gray-500 mb-2">{data.platform} • {data.data_type}</div>
      <table className="min-w-full text-xs">
        <thead>
          <tr className="text-left text-gray-500">
            <th className="py-1 pr-3">Name</th>
            <th className="py-1 pr-3">Type</th>
            <th className="py-1 pr-3">Nullable</th>
          </tr>
        </thead>
        <tbody>
          {cols.map((c: any) => (
            <tr key={c.name} className="border-t">
              <td className="py-1 pr-3 font-medium">{c.name}</td>
              <td className="py-1 pr-3">{c.type_text}</td>
              <td className="py-1 pr-3">{String(c.nullable)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function FollowInline({ datasetId }: { datasetId: string }) {
  const { data: social, mutate } = useSWR<any>(`/api/v1/datasets/${datasetId}/social`, apiGet)
  const { show } = useToast()
  return (
    <button
      onClick={async()=>{
        await apiPost('/api/v1/follows', { dataset_id: datasetId, follow: !(social?.following) })
        show(social?.following ? 'Unfollowed' : 'Following', 'success')
        mutate && mutate()
      }}
      className={`text-xs px-2 py-1 rounded border ${social?.following ? 'bg-green-600 text-white' : ''}`}
    >{social?.following ? 'Following' : 'Follow'}</button>
  )
}

function timeAgo(iso: string): string {
  try {
    const then = new Date(iso).getTime()
    const now = Date.now()
    const s = Math.max(0, Math.floor((now - then) / 1000))
    if (s < 60) return `${s}s ago`
    const m = Math.floor(s / 60)
    if (m < 60) return `${m}m ago`
    const h = Math.floor(m / 60)
    if (h < 24) return `${h}h ago`
    const d = Math.floor(h / 24)
    return `${d}d ago`
  } catch { return '' }
}

function selectKeyFields(cols: any[]): any[] {
  const byPriority = (name: string) => {
    const n = String(name || '').toLowerCase()
    if (n === 'id' || n.endsWith('_id')) return 0
    if (n === 'created_at' || n === 'updated_at' || n.endsWith('_ts') || n.endsWith('_time')) return 1
    if (n.includes('date')) return 2
    return 3
  }
  return [...cols].sort((a,b)=> byPriority(a.name) - byPriority(b.name))
}

function InlineDatasetStats({ datasetId }: { datasetId?: string }) {
  const { data: ds } = useSWR<any>(datasetId ? `/api/v1/datasets/${datasetId}` : null, apiGet)
  const { data: social } = useSWR<any>(datasetId ? `/api/v1/datasets/${datasetId}/social` : null, apiGet)
  if (!datasetId || !ds) return null
  const created = ds.created_at ? new Date(ds.created_at).toLocaleDateString() : undefined
  return (
    <div className="mt-2 text-xs text-gray-500">
      {created && <span>Added on {created}</span>}
      <span className="mx-2">•</span>
      <span>{social?.followers || 0} Followers</span>
      <span className="mx-2">•</span>
      <span>{social?.likes || 0} Likes</span>
    </div>
  )
}

function FriendlyEvent({ ev }: { ev: Event }) {
  const { data: ds } = useSWR<any>(ev.dataset_id ? `/api/v1/datasets/${ev.dataset_id}` : null, apiGet)
  const { data: preview } = useSWR<any>(ev.dataset_id ? `/api/v1/datasets/${ev.dataset_id}/preview` : null, apiGet)
  const { data: engagement, mutate: mutateEngagement } = useSWR<any>(ev.dataset_id ? `/api/v1/datasets/${ev.dataset_id}/engagement` : null, apiGet)
  const { data: social, mutate: mutateSocial } = useSWR<any>(ev.dataset_id ? `/api/v1/datasets/${ev.dataset_id}/social` : null, apiGet)
  const src: any = ds?.source_metadata_json || {}
  const tableKey = ev.dataset_id && src.catalog && src.schema && (src.table || src.name) ? `/api/v1/databricks/tables/${src.catalog}.${src.schema}.${src.table || src.name}` : null
  const { data: tableInfo } = useSWR<any>(tableKey, apiGet)
  const { show } = useToast()
  const [open, setOpen] = useState(false)
  const name = ds?.name || 'Dataset'
  const platform = ds?.source_type === 'databricks.uc' ? 'Databricks' : (ds?.source_type || '')
  let text = ''
  switch (ev.type) {
    case 'dataset.published':
      text = `${name} from ${platform || 'data platform'} has been added!`
      break
    case 'dataset.connected': {
      const target = (ev.payload_json?.platform as string) || 'your platform'
      text = `Someone connected ${name} to ${target}`
      break
    }
    case 'dataset.refreshed':
      text = `${name} was refreshed successfully`
      break
    case 'dataset.schema.changed':
      text = `${name} schema was updated`
      break
    default:
      text = ev.type
  }
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="font-medium flex items-center gap-2">
          <PlatformBadge sourceType={ds?.source_type} />
          <span>{text}</span>
        </div>
        {ev.dataset_id && (
          <div className="flex items-center gap-2">
            <button onClick={()=>setOpen(v=>!v)} className="text-sm px-3 py-1 border rounded">{open ? 'Collapse' : 'Expand'}</button>
            <Link href={`/datasets/${ev.dataset_id}`} className="text-sm px-3 py-1 border rounded">Open</Link>
          </div>
        )}
      </div>
      {ds?.description && (
        <div className="text-sm text-gray-700 dark:text-gray-300">{ds.description}</div>
      )}
      {preview?.schema_sample && preview.schema_sample.length > 0 && (
        <div className="text-xs">
          <div className="text-gray-500 mb-1">Key fields</div>
          <div className="flex flex-wrap gap-2">
            {selectKeyFields(preview.schema_sample).slice(0,3).map((c:any)=> (
              <span key={c.name} className="px-2 py-1 rounded bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                <span className="font-medium">{c.name}</span>
                <span className="text-gray-500">:{c.type_text}</span>
              </span>
            ))}
          </div>
        </div>
      )}
      {Array.isArray(ds?.tags) && ds.tags.length > 0 && (
        <div className="flex flex-wrap gap-2 text-xs">
          {ds.tags.slice(0,6).map((t:string)=> (
            <span key={t} className="badge chip">{t}</span>
          ))}
        </div>
      )}
      <div className="flex items-center gap-2 text-[11px]">
        {ds?.visibility && (
          <span className={`badge ${ds.visibility==='public' ? 'badge-success' : ds.visibility==='private' ? 'badge-danger' : 'badge-info'}`}>{ds.visibility==='internal' ? 'Restricted' : ds.visibility[0].toUpperCase()+ds.visibility.slice(1)}</span>
        )}
        {ds?.updated_at && (
          <span className="badge">Updated {timeAgo(ds.updated_at)}</span>
        )}
        {engagement && (
          <span className="badge">{engagement.counts?.likes || 0} Likes</span>
        )}
        {engagement && (
          <span className="badge">{engagement.counts?.followers || 0} Followers</span>
        )}
      </div>
      {engagement && (
        <div className="flex items-center gap-2 text-xs">
          <div className="flex -space-x-2">
            {(engagement.recent_actors || []).map((u:any)=> (
              <img key={u.id} src={u.avatar_url} alt={u.name} className="w-6 h-6 rounded-full border border-white dark:border-gray-900" />
            ))}
          </div>
          <span className="text-gray-500">{engagement.counts?.followers || 0} Followers • {engagement.counts?.likes || 0} Likes</span>
        </div>
      )}
      <InlineDatasetStats datasetId={ev.dataset_id} />
      {ev.dataset_id && (
        <div className="flex items-center gap-2 text-xs">
          <button
            onClick={async()=>{
              await apiPost('/api/v1/likes', { dataset_id: ev.dataset_id, follow: !(social?.liked) })
              show(social?.liked ? 'Removed like' : 'Liked dataset', 'success')
              mutateSocial && mutateSocial()
              mutateEngagement && mutateEngagement()
            }}
            className={`px-2 py-1 rounded border ${social?.liked ? 'bg-pink-600 text-white' : ''}`}
          >{social?.liked ? 'Liked' : 'Like'}</button>
          <button
            onClick={async()=>{
              await apiPost('/api/v1/follows', { dataset_id: ev.dataset_id, follow: !(social?.following) })
              show(social?.following ? 'Unfollowed' : 'Following', 'success')
              mutateSocial && mutateSocial()
              mutateEngagement && mutateEngagement()
            }}
            className={`px-2 py-1 rounded border ${social?.following ? 'bg-green-600 text-white' : ''}`}
          >{social?.following ? 'Following' : 'Follow'}</button>
        </div>
      )}
      {open && (
        <div className="mt-2">
          <div className="text-xs text-gray-500 mb-1">Schema</div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-xs">
              <thead>
                <tr className="text-left text-gray-500">
                  <th className="py-1 pr-3">Name</th>
                  <th className="py-1 pr-3">Type</th>
                  <th className="py-1 pr-3">Nullable</th>
                  <th className="py-1 pr-3">Comment</th>
                </tr>
              </thead>
              <tbody>
                {(tableInfo?.table?.columns || preview?.schema_sample || []).map((c:any)=> (
                  <tr key={c.name} className="border-t">
                    <td className="py-1 pr-3 font-medium">{c.name}</td>
                    <td className="py-1 pr-3">{c.type_text}</td>
                    <td className="py-1 pr-3">{String(c.nullable)}</td>
                    <td className="py-1 pr-3">{c.comment}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

export default function Home() {
  const { data } = useSWR<{ data: Event[] }>(`/api/v1/feed`, apiGet, { refreshInterval: 5000 })
  const { data: datasets } = useSWR<PaginatedDatasets>(`/api/v1/datasets?per_page=6`, apiGet)
  const { data: me } = useSWR<Me>(`/api/v1/users/me`, apiGet)
  const { data: meSocial } = useSWR<{ liked: string[]; following: string[] }>(`/api/v1/users/me/social`, apiGet)
  const [live, setLive] = useState<Event[]>([])
  const evtSrcRef = useRef<EventSource | null>(null)
  const [filter, setFilter] = useState<string>('all')
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})

  useEffect(() => {
    const es = new EventSource(`${process.env.NEXT_PUBLIC_API_BASE || 'http://127.0.0.1:8000'}/api/v1/feed/stream`)
    es.onmessage = (e) => {
      try {
        const ev = JSON.parse(e.data)
        setLive((prev) => [ev, ...prev].slice(0, 50))
      } catch {}
    }
    evtSrcRef.current = es
    return () => { es.close() }
  }, [])

  const events = [...(live || []), ...((data?.data as Event[]) || [])]
  const filtered = events.filter(ev => {
    if (filter === 'all') return true
    if (filter === 'new') return ev.type === 'dataset.published'
    if (filter === 'schema') return ev.type === 'dataset.schema.changed'
    if (filter === 'usage') return ev.type === 'dataset.connected' || ev.type === 'dataset.refreshed'
    if (filter === 'governance') return ev.type === 'contract.signed'
    if (filter === 'trending') return ['dataset.liked','user.followed'].includes(ev.type)
    return true
  })

  return (
    <main className="max-w-screen-2xl p-6 space-y-6">
      <Head>
        <title>Feed</title>
      </Head>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <aside className="hidden md:block sticky top-20 self-start">
          <div className="bg-white border rounded surface p-4">
            {!me ? (
              <div className="animate-pulse">
                <div className="h-12 w-12 rounded-full bg-gray-200" />
                <div className="mt-3 h-4 w-2/3 bg-gray-200 rounded" />
                <div className="mt-1 h-3 w-1/2 bg-gray-100 rounded" />
              </div>
            ) : (
              <div>
                {me.avatar_url ? (
                  <img src={me.avatar_url} alt={me.name} className="w-12 h-12 rounded-full border" />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center font-semibold">
                    {me.name.split(/\s+/).map(s=>s[0]?.toUpperCase()).slice(0,2).join('')}
                  </div>
                )}
                <div className="mt-2 font-medium">{me.name}</div>
                {(me.job_title || me.company) && (
                  <div className="text-xs text-gray-500">{me.job_title}{me.job_title && me.company ? ' • ' : ''}{me.company}</div>
                )}
                <div className="mt-3 flex items-center gap-3 text-xs text-gray-600">
                  <div><span className="font-medium">{meSocial?.following?.length || 0}</span> Following</div>
                  <div><span className="font-medium">{meSocial?.liked?.length || 0}</span> Likes</div>
                </div>
              </div>
            )}
          </div>
        </aside>
        <section className="md:col-span-2 space-y-3 max-h-[calc(100vh-6rem)] overflow-y-auto pr-1">
          <div className="sticky top-0 z-10 bg-gray-50 dark:bg-gray-900 pt-2">
            <Tabs
              tabs={[
                { id: 'all', label: 'All' },
                { id: 'new', label: 'New datasets' },
                { id: 'schema', label: 'Schema changes' },
                { id: 'usage', label: 'Usage updates' },
                { id: 'trending', label: 'Trending' },
                { id: 'governance', label: 'Data governance' },
              ]}
              active={filter}
              onChange={setFilter}
            />
          </div>
          <AnimatePresence initial={false}>
          {filtered.map((ev) => (
            <motion.div
              key={ev.id + ev.created_at}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2 }}
            >
              <Card className="surface">
                <CardContent>
                  <div className="text-sm text-gray-500">{new Date(ev.created_at).toLocaleString()}</div>
                  <FriendlyEvent ev={ev} />
                  <div className="mt-3 flex items-center gap-2 text-xs">
                    {ev.dataset_id && (
                      <Button size="sm" variant="secondary" onClick={()=>setExpanded(s=>({ ...s, [ev.id]: !s[ev.id] }))}>{expanded[ev.id] ? 'Hide' : 'View'}</Button>
                    )}
                    <Button size="sm" variant="ghost" onClick={()=>window.navigator.share ? window.navigator.share({ title: 'Dataset event', url: `/datasets/${ev.dataset_id || ''}` }).catch(()=>{}) : window.open(`/datasets/${ev.dataset_id || ''}`, '_blank')}>Share</Button>
                  </div>
                  {expanded[ev.id] && ev.dataset_id && (
                    <div className="mt-3">
                      <DatasetInlinePreview datasetId={ev.dataset_id} />
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          ))}
          </AnimatePresence>
        </section>
        <aside className="space-y-4 sticky top-20 self-start">
          <div className="bg-white border rounded surface p-4">
            <div className="font-medium mb-2">Trending datasets</div>
            <div className="space-y-2">
              {datasets?.data?.slice(0,5).map(ds => (
                <div key={ds.id} className="flex items-start justify-between gap-2">
                  <Link href={`/datasets/${ds.id}`} className="block">
                    <div className="text-sm font-medium">{ds.name}</div>
                    <div className="text-xs text-gray-500 line-clamp-2">{ds.description}</div>
                  </Link>
                  <FollowInline datasetId={ds.id} />
                </div>
              ))}
            </div>
          </div>
          <div className="bg-white border rounded surface p-4">
            <div className="font-medium mb-2">Recommended for you</div>
            <div className="space-y-2 text-sm text-gray-700 dark:text-gray-200">
              <div className="dark:text-gray-200">Based on your profile (role: {me?.role || 'consumer'})</div>
              {(datasets?.data || []).slice(5,8).map(ds => (
                <div key={ds.id} className="flex items-start justify-between gap-2">
                  <Link href={`/datasets/${ds.id}`} className="block">
                    <div className="text-sm font-medium">{ds.name}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-300 line-clamp-2">{ds.description}</div>
                  </Link>
                  <FollowInline datasetId={ds.id} />
                </div>
              ))}
            </div>
          </div>
          <div className="bg-white border rounded surface p-4">
            <div className="font-medium mb-2">Activity highlights</div>
            <ul className="text-sm text-gray-700 dark:text-gray-200 list-disc pl-4">
              <li>{filtered.filter(ev=>ev.type==='dataset.refreshed').length} refresh events in view</li>
              <li>{filtered.filter(ev=>ev.type==='dataset.schema.changed').length} schema updates in view</li>
              <li>{filtered.filter(ev=>ev.type==='dataset.published').length} new datasets in view</li>
            </ul>
          </div>
        </aside>
      </div>
    </main>
  )
}


