import { useRouter } from 'next/router'
import useSWR from 'swr'
import { apiGet, apiPost } from '@/lib/api'
import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Tabs, TabPanel } from '@/components/Tabs'
import Avatar from '@/components/Avatar'
import DatasetAboutCard from '@/components/DatasetAboutCard'
import type { Dataset as APIDataset, PaginatedEvents, EventItem } from '@/types/api'
import SchemaSection from '@/components/SchemaSection'
import { useToast } from '@/components/Toast'
import PlatformBadge from '@/components/PlatformBadge'
import Head from 'next/head'
import Link from 'next/link'
export default function DatasetPage() {
  const { show } = useToast()
  const router = useRouter()
  const { id } = router.query
  const { data } = useSWR<APIDataset>(id ? `/api/v1/datasets/${id}` : null, apiGet)
  const [connectResp, setConnectResp] = useState<any>(null)
  const { data: activity } = useSWR<PaginatedEvents>(id ? `/api/v1/datasets/${id}/activity` : null, apiGet)
  const { data: engagement } = useSWR<any>(id ? `/api/v1/datasets/${id}/engagement` : null, apiGet)
  type Social = { followers?: number; likes?: number }
  const { data: social } = useSWR<Social>(id ? `/api/v1/datasets/${id}/social` : null, apiGet)
  const [activeTab, setActiveTab] = useState<'overview'|'schema'|'activity'>('overview')
  const [showSource, setShowSource] = useState(false)
  const dbxHost = process.env.NEXT_PUBLIC_DATABRICKS_HOST as string | undefined
  const dbxWorkspaceId = process.env.NEXT_PUBLIC_DATABRICKS_WORKSPACE_ID as string | undefined
  const ucLink = useMemo(() => {
    if (!dbxHost) return undefined
    const src: any = data?.source_metadata_json || {}
    if (!(src.catalog && src.schema && (src.table || src.name))) return undefined
    const base = dbxHost.replace(/\/$/, '')
    const table = src.table || src.name
    const path = `${base}/explore/data/${src.catalog}/${src.schema}/${table}`
    return dbxWorkspaceId ? `${path}?o=${encodeURIComponent(dbxWorkspaceId)}` : path
  }, [dbxHost, dbxWorkspaceId, data])

  const lastUpdatedIso = (data as any)?.updated_at || (data as any)?.last_refreshed_at
  const freshness = (() => {
    if (!lastUpdatedIso) return undefined
    try {
      const then = new Date(String(lastUpdatedIso)).getTime()
      const ageHours = (Date.now() - then) / 36e5
      if (ageHours < 24) return { label: 'Fresh (<24h)', tone: 'success' }
      if (ageHours < 72) return { label: 'Okay (<72h)', tone: 'info' }
      return { label: 'Stale', tone: 'warning' }
    } catch { return undefined }
  })()

  const [showConnect, setShowConnect] = useState(false)
  const [connectPlatform, setConnectPlatform] = useState<'databricks'|'snowflake'|'duckdb'|''>('')

  const srcMeta = (data as any)?.source_metadata_json || {}
  const catalog = srcMeta.catalog || 'CATALOG'
  const schemaName = srcMeta.schema || 'SCHEMA'
  const tableName = srcMeta.table || srcMeta.name || data?.name || 'TABLE'
  const fullName = `${catalog}.${schemaName}.${tableName}`

  const dbxSQL = `-- Databricks SQL\nSELECT * FROM ${catalog}.${schemaName}.${tableName};`
  const snowflakeSQL = `-- You can access the table with the following command\n\nCREATE OR REPLACE ICEBERG TABLE ${catalog}.${schemaName}.${tableName}\n  CATALOG = 'unity_catalog_int_oauth_axr'\n  CATALOG_TABLE_NAME = '${tableName}'\n  AUTO_REFRESH = TRUE\n;\n\nSELECT * FROM ${catalog}.${schemaName}.${tableName};`
  const duckdbSQL = `-- DuckDB local (using Unity Catalog Iceberg REST)\nCREATE OR REPLACE SECRET dbx_creds( \n  TYPE iceberg,\n  TOKEN '<your_PAT_token>'\n);\n\nATTACH '${catalog}' AS dbx_iceberg_catalog (\n  TYPE iceberg,\n  SECRET dbx_creds,\n  ENDPOINT 'https://e2-demo-field-eng.cloud.databricks.com/api/2.1/unity-catalog/iceberg-rest'\n);\n\nDESCRIBE dbx_iceberg_catalog.${schemaName}.${tableName};`

  const onConnect = async () => {
    setShowConnect(v => !v)
    setConnectPlatform('')
  }

  if (!data) return (
    <main className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <div className="bg-white border rounded p-4 animate-pulse">
            <div className="h-12 w-12 rounded-full bg-gray-200" />
            <div className="mt-3 h-4 w-1/2 bg-gray-200 rounded" />
            <div className="mt-2 h-3 w-2/3 bg-gray-100 rounded" />
          </div>
        </div>
        <div className="lg:col-span-2 space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-white border rounded p-4 animate-pulse">
              <div className="h-4 w-1/5 bg-gray-200 rounded" />
              <div className="mt-2 h-3 w-full bg-gray-100 rounded" />
              <div className="mt-1 h-3 w-5/6 bg-gray-100 rounded" />
            </div>
          ))}
        </div>
      </div>
    </main>
  )
  return (
    <main className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Avatar name={data.name} />
          <div>
            <h1 className="text-2xl font-semibold flex items-center gap-2"><PlatformBadge sourceType={data.source_type} />{data.name}</h1>
            <div className="text-xs text-gray-500 mt-1">Birthplace: {data.source_metadata_json?.catalog ? `Databricks UC • ${data.source_metadata_json.catalog}.${data.source_metadata_json.schema}` : 'Unknown'}</div>
            <div className="text-xs text-gray-500">Birthday: {new Date(data.created_at).toLocaleDateString()}</div>
          </div>
        </div>
        <div className="flex gap-3 items-center">
          <div className="flex items-center gap-2 text-sm">
            <button
              onClick={async()=>{ await apiPost('/api/v1/follows', { dataset_id: data.id, follow: !(social as any)?.following }); location.reload() }}
              className={`px-2 py-1 border rounded ${ (social as any)?.following ? 'bg-green-600 text-white' : ''}`}
            >{(social as any)?.following ? 'Following' : 'Follow'}</button>
            <span className="text-gray-700"><span className="font-medium">{social?.followers || 0}</span> Followers</span>
            <button
              onClick={async()=>{ await apiPost('/api/v1/likes', { dataset_id: data.id, follow: !(social as any)?.liked }); location.reload() }}
              className={`px-2 py-1 rounded ${ (social as any)?.liked ? 'bg-pink-700 text-white' : 'bg-pink-600 text-white'}`}
            >{(social as any)?.liked ? 'Liked' : 'Like'}</button>
            <span className="text-gray-700"><span className="font-medium">{social?.likes || 0}</span> Likes</span>
            <AccessTag name={tableName} catalog={catalog} schema={schemaName} />
          </div>
          {ucLink && (
            <a href={ucLink} target="_blank" rel="noopener noreferrer" className="px-4 py-2 border rounded hover:bg-gray-50">Open in Unity Catalog</a>
          )}
          <button onClick={onConnect} className="px-4 py-2 text-white rounded" style={{ background: 'var(--primary)' }}>Connect</button>
        </div>
      </div>

      {showConnect && (
        <section className="bg-white border rounded p-4">
          <div className="font-medium mb-2">Choose a platform</div>
          <div className="flex items-center gap-2 mb-3">
            <button className={`px-3 py-1 border rounded ${connectPlatform==='databricks' ? 'bg-gray-100' : ''}`} onClick={()=>setConnectPlatform('databricks')}>Databricks</button>
            <button className={`px-3 py-1 border rounded ${connectPlatform==='snowflake' ? 'bg-gray-100' : ''}`} onClick={()=>setConnectPlatform('snowflake')}>Snowflake</button>
            <button className={`px-3 py-1 border rounded ${connectPlatform==='duckdb' ? 'bg-gray-100' : ''}`} onClick={()=>setConnectPlatform('duckdb')}>Local with DuckDB</button>
          </div>
          {connectPlatform && (
            <div>
              <div className="text-sm text-gray-600 mb-2">
                {connectPlatform==='databricks' && 'You can directly access the dataset with the following query'}
                {connectPlatform==='snowflake' && 'You can access the table with the following command'}
                {connectPlatform==='duckdb' && 'Run the following DuckDB commands locally'}
              </div>
              <pre className="text-xs bg-gray-50 p-3 rounded overflow-x-auto border"><code>{connectPlatform==='databricks' ? dbxSQL : connectPlatform==='snowflake' ? snowflakeSQL : duckdbSQL}</code></pre>
              {connectPlatform==='snowflake' && (
                <div className="mt-2">
                  <a
                    href="https://app.snowflake.com/mzwrrbk/sl70895/w3DFtZIWp5JK#query"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block mt-1 px-3 py-1 border rounded hover:bg-gray-50 text-sm"
                  >
                    Open in Snowflake
                  </a>
                </div>
              )}
            </div>
          )}
        </section>
      )}

      {connectResp && (
        <section className="bg-white border rounded p-4">
          <h2 className="font-medium">Connect Artifacts ({connectResp.platform})</h2>
          <pre className="text-xs bg-gray-50 p-2 rounded overflow-x-auto mt-2">{connectResp.payload?.snippet}</pre>
        </section>
      )}

      <Tabs
        tabs={[{id:'overview',label:'Overview'},{id:'schema',label:'Schema'},{id:'activity',label:'Activity'}]}
        active={activeTab}
        onChange={(id)=>setActiveTab(id as any)}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <DatasetAboutCard
          id={data.id}
          name={data.name}
          description={data.description}
          createdAt={data.created_at}
          source={data.source_metadata_json}
          social={social}
          onChanged={()=>{}}
          addressFullName={(data as any).source_metadata_json?.full_name || ((data as any).source_metadata_json?.catalog && (data as any).source_metadata_json?.schema && (data as any).source_metadata_json?.table ? `${(data as any).source_metadata_json.catalog}.${(data as any).source_metadata_json.schema}.${(data as any).source_metadata_json.table}` : undefined)}
          systemName={data.source_type === 'databricks.uc' ? 'Databricks' : String(data.source_type)}
          cloudProvider={process.env.NEXT_PUBLIC_CLOUD_PROVIDER || 'Unknown'}
          ownerEmail={(data as any).owner_email || undefined}
          lastRefreshAt={(data as any).last_refreshed_at}
        />
        <div className="lg:col-span-2">
          <TabPanel id="overview" active={activeTab}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white border rounded surface p-4">
                <div className="text-xs text-gray-500">Format</div>
                <div className="font-medium">{String(data.source_metadata_json?.format || 'n/a')}</div>
              </div>
              <div className="bg-white border rounded surface p-4">
                <div className="text-xs text-gray-500">Visibility</div>
                <div className="font-medium">
                  <span className={`badge ${String((data as any).visibility || 'internal')==='public' ? 'badge-success' : String((data as any).visibility || 'internal')==='internal' ? 'badge-info' : 'badge-danger'}`}>
                    {String((data as any).visibility || 'internal')==='internal' ? 'Restricted' : String((data as any).visibility || 'internal')}
                  </span>
                </div>
              </div>
              <div className="bg-white border rounded surface p-4">
                <div className="text-xs text-gray-500">Owner</div>
                <div className="font-medium">{String((data as any).owner_id)}</div>
              </div>
            </div>
            {Array.isArray((data as any).tags) && (data as any).tags.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {(data as any).tags.map((t: string) => (
                  <Link key={t} href={`/tags/${encodeURIComponent(t)}`} className="text-xs px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">#{t}</Link>
                ))}
              </div>
            )}
            <section className="bg-white border rounded surface p-4 mt-4">
              <div className="flex items-center justify-between">
                <h2 className="font-medium">Source metadata</h2>
                <button
                  onClick={() => setShowSource((v) => !v)}
                  className="text-sm px-2 py-1 border rounded hover:bg-gray-50"
                >{showSource ? 'Hide' : 'Show'}</button>
              </div>
              <div className="mt-2 flex items-center gap-2 text-xs">
                {freshness && (
                  <span className={`badge ${freshness.tone==='success' ? 'badge-success' : freshness.tone==='info' ? 'badge-info' : 'badge-warning'}`}>{freshness.label}</span>
                )}
                {lastUpdatedIso && (
                  <span className="badge">Updated {new Date(Number(lastUpdatedIso) || Date.parse(String(lastUpdatedIso))).toLocaleString()}</span>
                )}
                <span className="badge">Certified</span>
                {engagement?.health?.freshness_hours != null && (
                  <span className="badge">Freshness: {engagement.health.freshness_hours}h</span>
                )}
                {engagement?.health?.schema_changes_30d != null && (
                  <span className="badge">Schema changes 30d: {engagement.health.schema_changes_30d}</span>
                )}
              </div>
              <AnimatePresence initial={false}>
                {showSource && (
                  <motion.pre
                    key="src"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="text-xs bg-gray-50 p-2 rounded overflow-x-auto mt-2"
                  >
                    {JSON.stringify(data.source_metadata_json, null, 2)}
                  </motion.pre>
                )}
              </AnimatePresence>
            </section>
          </TabPanel>

          <TabPanel id="schema" active={activeTab}>
            <SchemaSection catalog={(data as any).source_metadata_json?.catalog} schemaName={(data as any).source_metadata_json?.schema} table={(data as any).source_metadata_json?.table} />
          </TabPanel>

          <TabPanel id="activity" active={activeTab}>
            <div className="space-y-3">
              {activity?.data?.map((ev: EventItem)=>(
                <div key={ev.id} className="bg-white border rounded p-4">
                  <div className="text-sm text-gray-500">{new Date(ev.created_at).toLocaleString()}</div>
                  <div className="font-medium">{ev.type}</div>
                  <pre className="text-xs mt-2 bg-gray-50 p-2 rounded overflow-x-auto">{JSON.stringify(ev.payload_json, null, 2)}</pre>
                </div>
              ))}
            </div>
          </TabPanel>
        </div>
      </div>

    </main>
  )
}

function AccessTag({ name, catalog, schema }: { name: string; catalog: string; schema: string }) {
  const { data, mutate } = useSWR<{ allowed?: boolean; error?: string }>(`/api/v1/tables/${encodeURIComponent(name)}/has_select?catalog=${encodeURIComponent(catalog)}&schema=${encodeURIComponent(schema)}`, apiGet)
  const allowed = data?.allowed
  const [requested, setRequested] = useState(false)
  return (
    <span className={`text-xs px-2 py-0.5 rounded border ${allowed ? 'bg-green-50 border-green-300 text-green-700' : requested ? 'bg-blue-50 border-blue-300 text-blue-700' : 'bg-yellow-50 border-yellow-300 text-yellow-700'}`}>
      {allowed ? 'Access granted' : requested ? 'Access Request sent' : (
        <button
          className="underline"
          title="Request access"
          onClick={async(e)=>{
            e.preventDefault()
            const ok = typeof window !== 'undefined' ? window.confirm(`Request SELECT on ${catalog}.${schema}.${name} for francis.laurens@databricks.com?`) : true
            if (!ok) return
            try {
              const full_name = `${catalog}.${schema}.${name}`
              await apiPost('/api/v1/rfa/request', { securable_type: 'TABLE', full_name, permissions: ['SELECT'], principal: 'francis.laurens@databricks.com', comment: `Requesting SELECT on ${full_name}` })
              setRequested(true)
              mutate()
            } catch {}
          }}
        >
          request access
        </button>
      )}
    </span>
  )
}


