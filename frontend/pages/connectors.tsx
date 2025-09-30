import useSWR from 'swr'
import Head from 'next/head'
import { useToast } from '@/components/Toast'
import { useRouter } from 'next/router'
import { apiGet, apiPost } from '@/lib/api'
import type { ConnectorList, ConnectorTestResponse } from '@/types/api'
import { useState } from 'react'
import { Info, CheckCircle, XCircle, Loader2 } from 'lucide-react'

export default function ConnectorsPage() {
  const { data, mutate } = useSWR<ConnectorList>('/api/v1/connectors', apiGet)
  const [testingId, setTestingId] = useState<string | null>(null)
  const [sfStatus, setSfStatus] = useState<string>("")
  const [sfDetails, setSfDetails] = useState<any>(null)
  const [sfLoading, setSfLoading] = useState<boolean>(false)
  const [sfOk, setSfOk] = useState<boolean | null>(null)
  const [dbxStatus, setDbxStatus] = useState<string>("")
  const [dbxDetails, setDbxDetails] = useState<any>(null)
  const [dbxLoading, setDbxLoading] = useState<boolean>(false)
  const [dbxOk, setDbxOk] = useState<boolean | null>(null)
  const [pgStatus, setPgStatus] = useState<string>("")
  const [pgDetails, setPgDetails] = useState<any>(null)
  const [pgLoading, setPgLoading] = useState<boolean>(false)
  const [pgOk, setPgOk] = useState<boolean | null>(null)
  const { show } = useToast()
  const router = useRouter()

  function Selector() {
    const [tech, setTech] = useState<'snowflake'|'databricks'|'postgres'|''>('')
    const [loading, setLoading] = useState(false)
    const [step, setStep] = useState<'choose'|'schema'|'dataset'>('choose')
    const [items, setItems] = useState<string[]>([])
    const [schemas, setSchemas] = useState<string[]>([])
    const [catalog, setCatalog] = useState<string>('')
    const [schema, setSchema] = useState<string>('')
    const [selectedTables, setSelectedTables] = useState<string[]>([])
    const defaultDbxCatalog = (process.env.NEXT_PUBLIC_DATABRICKS_CATALOG as string) || 'axel_richier'

    const loadForSnowflake = async () => {
      setLoading(true)
      setItems([]); setSchemas([])
      try {
        const res = await apiPost<ConnectorTestResponse>('/api/v1/connectors/snowflake/test', {})
        setSchemas((res.details?.schemas_sample || []) as string[])
        setItems([])
        setStep('schema')
      } finally { setLoading(false) }
    }

    const loadForDbx = async () => {
      setLoading(true)
      setItems([]); setSchemas([])
      try {
        const res = await apiPost<ConnectorTestResponse>('/api/v1/connectors/databricks/test', {})
        setSchemas(((res.details?.schemas as string[]) || (res.details?.schemas_sample as string[]) || []) as string[])
        setCatalog(res.details?.catalog || catalog || defaultDbxCatalog)
        setSchema(res.details?.schema || schema)
        setItems([])
        setSelectedTables([])
        setStep('schema')
      } finally { setLoading(false) }
    }

    const loadForPostgres = async () => {
      setLoading(true)
      setItems([]); setSchemas([])
      try {
        const res = await apiPost<ConnectorTestResponse>('/api/v1/connectors/postgres/test', {})
        setSchemas((res.details?.schemas_sample || []) as string[])
        setSchema((res.details?.schema as string) || 'printshop')
        setItems((res.details?.tables_sample || []) as string[])
        setSelectedTables([])
        setStep('schema')
      } finally { setLoading(false) }
    }

    const importDbx = async (full: string) => {
      // Prefer catalog/schema from details if present
      const parts = full.split('.')
      let c = catalog || parts[0] || defaultDbxCatalog
      let s = schema || parts[1]
      let t = parts[parts.length - 1]
      if (!(c && s && t)) return
      await apiPost('/api/v1/databricks/import', { catalog: c, schema: s, table: t })
    }

    const importPostgres = async () => {
      if (!(schema && selectedTables.length)) return
      await apiPost('/api/v1/postgres/import', { schema, tables: selectedTables })
    }

    const loadTablesForDbx = async (sch: string) => {
      // Reuse test endpoint to keep UI simple; backend returns sample tables for current catalog+schema
      setLoading(true)
      try {
        const res = await apiPost<ConnectorTestResponse>('/api/v1/connectors/databricks/test', { catalog: catalog || defaultDbxCatalog, schema: sch })
        setItems((res.details?.tables_sample || []) as string[])
        setSelectedTables([])
        setStep('dataset')
      } finally { setLoading(false) }
    }

    const loadTablesForSnowflake = async (sch: string) => {
      setLoading(true)
      try {
        const res = await apiPost<ConnectorTestResponse>('/api/v1/connectors/snowflake/test', {})
        setItems((res.details?.tables_sample || []) as string[])
        setSelectedTables([])
        setStep('dataset')
      } finally { setLoading(false) }
    }

    const loadTablesForPostgres = async (sch: string) => {
      setLoading(true)
      try {
        const res = await apiPost<ConnectorTestResponse>('/api/v1/connectors/postgres/test', { schema: sch })
        setItems((res.details?.tables_sample || []) as string[])
        setSelectedTables([])
        setStep('dataset')
      } finally { setLoading(false) }
    }

    return (
      <section className="bg-white border rounded p-4 space-y-3">
        <div className="font-medium">Add datasets</div>
        <div className="flex items-center gap-2 text-sm">
          <button onClick={()=>{ setTech('snowflake'); loadForSnowflake() }} className={`px-3 py-1 rounded border ${tech==='snowflake' ? 'bg-gray-100' : ''}`}>Snowflake</button>
          <button onClick={()=>{ setTech('databricks'); loadForDbx() }} className={`px-3 py-1 rounded border ${tech==='databricks' ? 'bg-gray-100' : ''}`}>Databricks</button>
          <button onClick={()=>{ setTech('postgres'); loadForPostgres() }} className={`px-3 py-1 rounded border ${tech==='postgres' ? 'bg-gray-100' : ''}`}>Postgres</button>
        </div>
        {loading && <div className="text-sm text-gray-500">Loading...</div>}
        {!loading && tech && step==='schema' && (
          <div className="space-y-2">
            <div className="font-medium">Select schema</div>
            <select className="w-full p-2 border rounded" value={schema} onChange={(e)=>{ const sch=e.target.value; setSchema(sch) }}>
              <option value="" disabled>Select a schema…</option>
              {schemas.map(sch => (<option key={sch} value={sch}>{sch}</option>))}
            </select>
            <div>
              <button
                onClick={()=>{
                  if (!schema) return
                  if (tech==='databricks') loadTablesForDbx(schema)
                  else if (tech==='snowflake') loadTablesForSnowflake(schema)
                  else loadTablesForPostgres(schema)
                }}
                disabled={!schema || loading}
                className="px-3 py-1 text-white rounded disabled:opacity-50"
                style={{ background: 'var(--primary)' }}
              >
                Select this schema
              </button>
            </div>
          </div>
        )}
        {!loading && tech && step==='dataset' && (
          <div className="space-y-2">
            <div className="font-medium">Select dataset</div>
            <div className="text-xs text-gray-600">{tech==='databricks' ? `Catalog: ${catalog || 'n/a'} • ` : ''}Schema: {schema || 'n/a'}</div>
            <div className="max-h-64 overflow-y-auto border rounded">
              <ul className="text-sm">
                {items.map(n => (
                  <li key={n} className="flex items-center gap-2 px-2 py-1">
                    <input type="checkbox" checked={selectedTables.includes(n)} onChange={(e)=>{
                      setSelectedTables(prev => e.target.checked ? [...prev, n] : prev.filter(x=>x!==n))
                    }} />
                    <span className="flex-1">{n}</span>
                    {tech==='databricks' && (
                      <DbxAccessTag name={n} catalog={catalog || defaultDbxCatalog} schema={schema} />
                    )}
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex items-center gap-2">
              <button
                disabled={selectedTables.length===0 || (tech!=='databricks' && tech!=='postgres')}
                title={(tech==='snowflake') ? 'Snowflake import coming soon' : (selectedTables.length===0 ? 'Select at least one dataset' : '')}
                onClick={async()=>{
                  if (tech==='databricks') {
                    for (const n of selectedTables) { await importDbx(n) }
                    show(`Imported ${selectedTables.length} dataset(s)`, 'success')
                    router.push('/datasets')
                  } else if (tech==='postgres') {
                    await importPostgres()
                    show(`Imported ${selectedTables.length} dataset(s) from Postgres`, 'success')
                    router.push('/datasets')
                  }
                }}
                className="px-3 py-1 text-white rounded disabled:opacity-50"
                style={{ background: 'var(--primary)' }}
              >
                Add datasets
              </button>
              <span className="text-xs text-gray-600">{selectedTables.length} selected</span>
            </div>
          </div>
        )}
      </section>
    )
  }

  function DbxAccessTag({ name, catalog, schema }: { name: string; catalog: string; schema: string }) {
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
                await apiPost('/api/v1/rfa/request', { securable_type: 'TABLE', full_name, permissions: ['SELECT'], principal: 'francis.laurens@databricks.com', comment: 'Requesting SELECT' })
                setRequested(true)
                show('Access request sent', 'success')
                mutate()
              } catch (err: any) {
                show(err?.message || 'Failed to request access', 'error')
              }
            }}
          >
            request access
          </button>
        )}
      </span>
    )
  }

  const testConnector = async (id: string) => {
    setTestingId(id)
    try {
      await apiPost(`/api/v1/connectors/${id}/test`, { config: { ping: true } })
      await mutate()
    } finally {
      setTestingId(null)
    }
  }

  return (
    <main className="max-w-4xl mx-auto p-6 space-y-4">
      <Head>
        <title>Connectors</title>
      </Head>
      <h1 className="text-2xl font-semibold">Connectors</h1>
      <div className="bg-white border rounded divide-y">
        {data?.data?.map(c => (
          <div key={c.id} className="p-4 flex items-center justify-between">
            <div>
              <div className="font-medium">{c.type}</div>
              <div className="text-xs text-gray-500">{c.capability_flags.join(', ')}</div>
            </div>
            <button onClick={() => testConnector(c.id)} className="px-3 py-1 bg-gray-800 text-white rounded" disabled={testingId === c.id}>
              {testingId === c.id ? 'Testing...' : 'Test'}
            </button>
          </div>
        ))}
      </div>
      <Selector />
      <section className="bg-white border rounded p-4 space-y-3">
        <div className="flex items-center gap-2">
          <div className="font-medium">Snowflake</div>
          <span title="Uses server env vars (SNOW_ACCOUNT, SNOW_USERNAME, SNOW_PWD; optional: SNOW_WAREHOUSE, SNOW_DATABASE, SNOW_SCHEMA). No credentials are sent from the browser."><Info size={16} className="text-gray-500" /></span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={async()=>{
              setSfStatus('')
              setSfLoading(true)
              try {
                const res = await apiPost<ConnectorTestResponse>('/api/v1/connectors/snowflake/test', {})
                setSfStatus(res.ok ? 'Connection OK' : `Error: ${res.error}`)
                setSfOk(!!res.ok)
                if (res.ok && res.details) setSfDetails(res.details)
              } catch (e: any) {
                setSfStatus(e.message || String(e))
                setSfOk(false)
              } finally {
                setSfLoading(false)
              }
            }}
            className="px-4 py-2 text-white rounded"
            style={{ background: 'var(--primary)' }}
          >
            Test Snowflake connection
          </button>
          {sfLoading && <Loader2 className="animate-spin text-gray-500" size={18} />}
          {sfOk === true && <CheckCircle className="text-green-600" size={18} />}
          {sfOk === false && <XCircle className="text-red-600" size={18} />}
          {sfStatus && <span className="text-sm">{sfStatus}</span>}
        </div>
        {sfDetails && (
          <div className="mt-3 text-sm">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="bg-white border rounded p-3">
                <div className="font-medium mb-1">Databases ({(sfDetails.databases || []).length})</div>
                <ul className="list-disc pl-5">
                  {(sfDetails.databases || []).map((d: string) => (<li key={d}>{d}</li>))}
                </ul>
              </div>
              <div className="bg-white border rounded p-3">
                <div className="font-medium mb-1">Schemas (sample)</div>
                <ul className="list-disc pl-5">
                  {(sfDetails.schemas_sample || []).map((s: string) => (<li key={s}>{s}</li>))}
                </ul>
              </div>
              <div className="bg-white border rounded p-3">
                <div className="font-medium mb-1">Tables (sample)</div>
                <ul className="list-disc pl-5">
                  {(sfDetails.tables_sample || []).map((t: string) => (<li key={t}>{t}</li>))}
                </ul>
              </div>
            </div>
          </div>
        )}
      </section>
      <section className="bg-white border rounded p-4 space-y-3">
        <div className="flex items-center gap-2">
          <div className="font-medium">Databricks</div>
          <span title="Uses workspace auth (profile/env). Optionally set DATABRICKS_CATALOG and DATABRICKS_SCHEMA on the server to sample schemas/tables."><Info size={16} className="text-gray-500" /></span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={async()=>{
              setDbxStatus('')
              setDbxLoading(true)
              try {
                const res = await apiPost<ConnectorTestResponse>('/api/v1/connectors/databricks/test', {})
                setDbxStatus(res.ok ? 'Connection OK' : `Error: ${res.error}`)
                setDbxOk(!!res.ok)
                if (res.ok && res.details) setDbxDetails(res.details)
              } catch (e: any) {
                setDbxStatus(e.message || String(e))
                setDbxOk(false)
              } finally {
                setDbxLoading(false)
              }
            }}
            className="px-4 py-2 text-white rounded"
            style={{ background: 'var(--primary)' }}
          >
            Test Databricks connection
          </button>
          {dbxLoading && <Loader2 className="animate-spin text-gray-500" size={18} />}
          {dbxOk === true && <CheckCircle className="text-green-600" size={18} />}
          {dbxOk === false && <XCircle className="text-red-600" size={18} />}
          {dbxStatus && <span className="text-sm">{dbxStatus}</span>}
        </div>
        {dbxDetails && (
          <div className="mt-3 text-sm">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="bg-white border rounded p-3">
                <div className="font-medium mb-1">Catalogs</div>
                <ul className="list-disc pl-5">
                  {(dbxDetails.catalogs || []).map((c: string) => (<li key={c}>{c}</li>))}
                </ul>
              </div>
              <div className="bg-white border rounded p-3">
                <div className="font-medium mb-1">Schemas (sample)</div>
                <ul className="list-disc pl-5">
                  {(dbxDetails.schemas_sample || []).map((s: string) => (<li key={s}>{s}</li>))}
                </ul>
              </div>
              <div className="bg-white border rounded p-3">
                <div className="font-medium mb-1">Tables (sample)</div>
                <ul className="list-disc pl-5">
                  {(dbxDetails.tables_sample || []).map((t: string) => (<li key={t}>{t}</li>))}
                </ul>
              </div>
            </div>
          </div>
        )}
      </section>
      <section className="bg-white border rounded p-4 space-y-3">
        <div className="flex items-center gap-2">
          <div className="font-medium">Postgres (printshop)</div>
          <span title="Uses the app DATABASE_URL; lists tables from schema 'printshop' or PG_IMPORT_SCHEMA."><Info size={16} className="text-gray-500" /></span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={async()=>{
              setPgStatus('')
              setPgLoading(true)
              try {
                const res = await apiPost<ConnectorTestResponse>('/api/v1/connectors/postgres/test', {})
                setPgStatus(res.ok ? 'Connection OK' : `Error: ${res.error}`)
                setPgOk(!!res.ok)
                if (res.ok && res.details) setPgDetails(res.details)
              } catch (e: any) {
                setPgStatus(e.message || String(e))
                setPgOk(false)
              } finally {
                setPgLoading(false)
              }
            }}
            className="px-4 py-2 text-white rounded"
            style={{ background: 'var(--primary)' }}
          >
            Test Postgres connection
          </button>
          {pgLoading && <Loader2 className="animate-spin text-gray-500" size={18} />}
          {pgOk === true && <CheckCircle className="text-green-600" size={18} />}
          {pgOk === false && <XCircle className="text-red-600" size={18} />}
          {pgStatus && <span className="text-sm">{pgStatus}</span>}
        </div>
        {pgDetails && (
          <div className="mt-3 text-sm">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="bg-white border rounded p-3">
                <div className="font-medium mb-1">Schemas (sample)</div>
                <ul className="list-disc pl-5">
                  {(pgDetails.schemas_sample || []).map((s: string) => (<li key={s}>{s}</li>))}
                </ul>
              </div>
              <div className="bg-white border rounded p-3">
                <div className="font-medium mb-1">Tables in schema</div>
                <ul className="list-disc pl-5">
                  {(pgDetails.tables_sample || []).map((t: string) => (<li key={t}>{t}</li>))}
                </ul>
              </div>
            </div>
            {(pgDetails.tables_sample || []).length > 0 && (
              <div className="mt-3">
                <button
                  onClick={async()=>{
                    const schema = (pgDetails.schema || 'printshop') as string
                    const tables = (pgDetails.tables_sample || []) as string[]
                    await apiPost('/api/v1/postgres/import', { schema, tables })
                    show(`Imported ${tables.length} dataset(s) from Postgres`, 'success')
                    router.push('/datasets')
                  }}
                  className="px-4 py-2 text-white rounded"
                  style={{ background: 'var(--primary)' }}
                >
                  Import all listed tables
                </button>
              </div>
            )}
          </div>
        )}
      </section>
    </main>
  )
}


