import useSWR from 'swr'
import { useState } from 'react'
import { apiGet } from '@/lib/api'

export default function SchemaSection({ catalog, schemaName, table }: { catalog?: string; schemaName?: string; table?: string }) {
  if (!(catalog && schemaName && table)) {
    return <div className="bg-white border rounded p-4 text-sm text-gray-500">No Unity Catalog metadata available.</div>
  }
  const { data, error } = useSWR<{ table: any }>(`/api/v1/databricks/tables/${catalog}.${schemaName}.${table}`, apiGet)
  const [open, setOpen] = useState(false)
  if (error) return <div className="bg-white border rounded p-4 text-sm text-red-700">{String(error)}</div>
  if (!data) return <div className="bg-white border rounded p-4 text-sm">Loading schema…</div>
  const t = data.table || {}
  const cols = t.columns || []
  return (
    <section className="bg-white border rounded p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="font-medium">Columns</div>
        <button onClick={()=>setOpen(v=>!v)} className="text-sm px-2 py-1 border rounded hover:bg-gray-50">{open ? 'Collapse' : 'Expand'}</button>
      </div>
      {!open && (
        <div className="text-xs">
          <div className="text-gray-500 mb-1">Key fields</div>
          <div className="flex flex-wrap gap-2">
            {selectKeyFields(cols).slice(0,3).map((c:any)=> (
              <span key={c.name} className="px-2 py-1 rounded bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                <span className="font-medium">{c.name}</span>
                <span className="text-gray-500">:{c.type_text}</span>
              </span>
            ))}
          </div>
        </div>
      )}
      {open && (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500">
                <th className="py-2 pr-4">Name</th>
                <th className="py-2 pr-4">Type</th>
                <th className="py-2 pr-4">Nullable</th>
                <th className="py-2 pr-4">Comment</th>
              </tr>
            </thead>
            <tbody>
              {cols.map((c: any) => (
                <tr key={c.name} className="border-t">
                  <td className="py-2 pr-4 font-medium">{c.name}</td>
                  <td className="py-2 pr-4">{c.type_text}</td>
                  <td className="py-2 pr-4">{String(c.nullable)}</td>
                  <td className="py-2 pr-4">{c.comment}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

function selectKeyFields(cols: any[]): any[] {
  const byPriority = (name: string) => {
    const n = name.toLowerCase()
    if (n === 'id' || n.endsWith('_id')) return 0
    if (n === 'created_at' || n === 'updated_at' || n.endsWith('_ts') || n.endsWith('_time')) return 1
    if (n.includes('date')) return 2
    return 3
  }
  return [...cols].sort((a,b)=> byPriority(a.name) - byPriority(b.name))
}


