import useSWR from 'swr'
import Link from 'next/link'
import { useState } from 'react'
import { apiGet } from '@/lib/api'

type User = { id: string; name: string; email: string; avatar_url?: string; job_title?: string; company?: string; subsidiary?: string }

export default function People() {
  const [q, setQ] = useState('')
  const { data } = useSWR<{ data: User[]; total: number }>(`/api/v1/users${q ? `?q=${encodeURIComponent(q)}` : ''}`, apiGet)
  const users = data?.data || []

  return (
    <main className="max-w-5xl mx-auto p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">People</h1>
        <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search people" className="border rounded p-2 w-64" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {users.map(u => (
          <Link key={u.id} href={`/users/${u.id}`} className="bg-white dark:bg-slate-900 border dark:border-gray-700 rounded p-4 hover:shadow">
            <div className="flex items-center gap-3">
              <img src={u.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.name || 'U')}`} alt={u.name} className="w-12 h-12 rounded-full border" />
              <div>
                <div className="font-medium">{u.name}</div>
                <div className="text-xs text-gray-500">{u.job_title ? `${u.job_title} • ` : ''}{u.company}{u.subsidiary ? ` — ${u.subsidiary}` : ''}</div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </main>
  )
}



