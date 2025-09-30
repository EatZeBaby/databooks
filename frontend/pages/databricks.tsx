import useSWR from 'swr'
import { useEffect, useMemo, useState } from 'react'
import { apiGet, apiPost } from '@/lib/api'
import type { Dataset } from '@/types/api'
import Link from 'next/link'

type SchemasResp = { schemas: string[] }
type TablesResp = { tables: { name: string; full_name: string; table_type?: string; data_source_format?: string }[] }

const CATALOG = 'axel_richier'

export default function DatabricksImport() {
  const [schema, setSchema] = useState<string>('')
  const { data: schemas } = useSWR<SchemasResp>(`/api/v1/databricks/catalogs/${CATALOG}/schemas`, apiGet)
  const { data: tables } = useSWR<TablesResp>(schema ? `/api/v1/databricks/catalogs/${CATALOG}/schemas/${schema}/tables` : null, apiGet)
  const [importing, setImporting] = useState<string | null>(null)
  const [imported, setImported] = useState<string | null>(null)

  useEffect(() => {
    if (schemas?.schemas?.length && !schema) setSchema(schemas.schemas[0])
  }, [schemas, schema])

  const onImport = async (table: string) => {
    setImporting(table)
    try {
      const ds = await apiPost<Dataset>('/api/v1/databricks/import', { catalog: CATALOG, schema, table })
      setImported(ds.id)
    } finally {
      setImporting(null)
    }
  }

  return (
    <main className="max-w-5xl mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Databricks Catalog: {CATALOG}</h1>
      <div className="flex items-center gap-2">
        <label className="text-sm">Schema:</label>
        <select value={schema} onChange={e=>setSchema(e.target.value)} className="border rounded p-2">
          {schemas?.schemas?.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>
      <div className="bg-white border rounded divide-y">
        {tables?.tables?.map(t => (
          <div key={t.full_name} className="p-4 flex items-center justify-between">
            <div>
              <div className="font-medium">{t.full_name}</div>
              <div className="text-xs text-gray-500">{t.table_type} {t.data_source_format ? `• ${t.data_source_format}` : ''}</div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => onImport(t.name)} className="px-3 py-1 text-white rounded" style={{ background: 'var(--primary)' }} disabled={importing === t.name}>
                {importing === t.name ? 'Importing...' : 'Add to catalog'}
              </button>
              {imported && <Link href={`/datasets/${imported}`} className="text-sm text-blue-700">View</Link>}
            </div>
          </div>
        ))}
      </div>
    </main>
  )
}


