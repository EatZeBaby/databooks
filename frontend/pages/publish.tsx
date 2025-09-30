import { useState } from 'react'
import { apiPost } from '@/lib/api'
import type { Dataset } from '@/types/api'
import { useRouter } from 'next/router'

export default function PublishPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [ownerId, setOwnerId] = useState('owner-1')
  const [orgId, setOrgId] = useState('org-1')
  const [sourceType, setSourceType] = useState('s3')
  const [visibility, setVisibility] = useState<'public'|'internal'|'private'>('internal')
  const [sourcePath, setSourcePath] = useState('s3://bucket/path')
  const [format, setFormat] = useState('parquet')

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const payload = {
      name,
      description,
      owner_id: ownerId,
      org_id: orgId,
      source_type: sourceType,
      visibility,
      source_metadata_json: { path: sourcePath, format }
    }
    const ds = await apiPost<Dataset>('/api/v1/datasets', payload)
    router.push(`/datasets/${ds.id}`)
  }

  return (
    <main className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-semibold mb-4">Publish dataset</h1>
      <form onSubmit={onSubmit} className="space-y-4 bg-white border rounded p-4">
        <div>
          <label className="block text-sm">Name</label>
          <input className="mt-1 w-full border rounded p-2" value={name} onChange={e=>setName(e.target.value)} required />
        </div>
        <div>
          <label className="block text-sm">Description</label>
          <textarea className="mt-1 w-full border rounded p-2" value={description} onChange={e=>setDescription(e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm">Owner ID</label>
            <input className="mt-1 w-full border rounded p-2" value={ownerId} onChange={e=>setOwnerId(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm">Org ID</label>
            <input className="mt-1 w-full border rounded p-2" value={orgId} onChange={e=>setOrgId(e.target.value)} />
          </div>
        </div>
        {/* Company/Domain removed for now */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm">Source type</label>
            <input className="mt-1 w-full border rounded p-2" value={sourceType} onChange={e=>setSourceType(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm">Visibility</label>
            <select className="mt-1 w-full border rounded p-2" value={visibility} onChange={e=>setVisibility(e.target.value as any)}>
              <option value="public">public</option>
              <option value="internal">internal</option>
              <option value="private">private</option>
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm">Source path</label>
            <input className="mt-1 w-full border rounded p-2" value={sourcePath} onChange={e=>setSourcePath(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm">Format</label>
            <input className="mt-1 w-full border rounded p-2" value={format} onChange={e=>setFormat(e.target.value)} />
          </div>
        </div>
        <button className="px-4 py-2 text-white rounded" style={{ background: 'var(--primary)' }} type="submit">Publish</button>
      </form>
    </main>
  )
}


