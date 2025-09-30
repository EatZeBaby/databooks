import useSWR from 'swr'
import { apiGet } from '@/lib/api'

type Health = { ok: boolean; error?: string; database?: string; schema?: string; tables?: string[] }

export default function DbHealthPage() {
  const { data, error, isLoading, mutate } = useSWR<Health>('/api/v1/db/health', apiGet, { refreshInterval: 0 })

  return (
    <main className="max-w-2xl mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Postgres Connection Test</h1>
      <div className={`p-4 border rounded ${data?.ok ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
        {isLoading && <div>Checking...</div>}
        {error && <div className="text-red-700">{String(error)}</div>}
        {data && (
          <div>
            <div className="font-medium">Status: {data.ok ? 'OK' : 'ERROR'}</div>
            {!data.ok && data.error && <div className="text-sm text-red-700">{data.error}</div>}
            {data.ok && (
              <div className="mt-2 text-sm">
                <div>Database: <span className="font-medium">{data.database}</span></div>
                <div>Schema: <span className="font-medium">{data.schema}</span></div>
                <div className="mt-2">Tables:</div>
                <ul className="list-disc pl-6">
                  {data.tables?.map(t => <li key={t}>{t}</li>)}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
      <button onClick={()=>mutate()} className="px-3 py-1 border rounded">Refresh</button>
    </main>
  )
}


