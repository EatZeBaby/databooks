import { useRouter } from 'next/router'
import useSWR from 'swr'
import Head from 'next/head'
import Link from 'next/link'
import { apiGet } from '@/lib/api'
import { useState } from 'react'

export default function TagPage() {
  const { query } = useRouter()
  const tag = query.tag as string | undefined
  const { data } = useSWR<{ data: { id: string; name: string; description?: string; visibility?: string }[] }>(tag ? `/api/v1/tags/${encodeURIComponent(tag)}/datasets` : null, apiGet)
  const { data: social, mutate } = useSWR<any>(tag ? `/api/v1/tags/${encodeURIComponent(tag)}/followers` : null, apiGet)
  const [saving, setSaving] = useState(false)
  return (
    <main className="max-w-5xl mx-auto p-6 space-y-4">
      <Head><title>Tag: {tag}</title></Head>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">#{tag}</h1>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-gray-600">{social?.followers || 0} followers</span>
          <button disabled={saving}
            onClick={async()=>{
              if (!tag) return
              setSaving(true)
              try { await fetch(`${process.env.NEXT_PUBLIC_API_BASE || ''}/api/v1/tags/${encodeURIComponent(tag)}/follow?follow=${!(social?.following)}`, { method: 'POST' }); await mutate() } finally { setSaving(false) }
            }}
            className={`px-2 py-1 border rounded ${social?.following ? 'bg-green-600 text-white' : ''}`}
          >{social?.following ? 'Following' : 'Follow'}</button>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {data?.data?.map(d => (
          <Link href={`/datasets/${d.id}`} key={d.id} className="bg-white border rounded p-4 hover:shadow">
            <div className="font-medium">{d.name}</div>
            <div className="text-sm text-gray-600 line-clamp-2">{d.description}</div>
            <div className="text-xs text-gray-500 mt-2">{d.visibility}</div>
          </Link>
        ))}
      </div>
    </main>
  )
}


