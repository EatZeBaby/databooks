import useSWR from 'swr'
import Head from 'next/head'
import Link from 'next/link'
import { apiGet } from '@/lib/api'
import { useMemo } from 'react'

type User = { id: string; name: string; email: string; avatar_url?: string; job_title?: string; company?: string; subsidiary?: string }

export default function GroupsPage() {
  const { data: me } = useSWR<User>('/api/v1/users/me', apiGet)
  // Fetch a high limit to include all seeded users
  const { data: usersResp } = useSWR<{ data: User[]; total: number }>('/api/v1/users?limit=500', apiGet)
  const users = usersResp?.data || []

  const companies = useMemo(() => {
    const deriveCompany = (u: User): string => {
      if (u.company && u.company.trim()) return u.company
      // Try derive from email domain like name@renoir.example.com -> Renoir
      const m = (u.email || '').split('@')[1] || ''
      const brand = (m.split('.')[0] || '').trim()
      if (brand) return brand.charAt(0).toUpperCase() + brand.slice(1)
      return 'Unknown'
    }
    const map = new Map<string, User[]>()
    for (const u of users) {
      const key = deriveCompany(u)
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(u)
    }
    return Array.from(map.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
  }, [users])

  const groups = [
    { id: 'team-me', name: 'My Team', members: [me].filter(Boolean) as User[] },
  ]
  return (
    <main className="max-w-5xl mx-auto p-6 space-y-6">
      <Head><title>Groups & Teams</title></Head>
      <h1 className="text-2xl font-semibold">Groups & Teams</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {groups.map(g => (
          <div key={g.id} className="bg-white border rounded p-4">
            <div className="font-medium mb-2">{g.name}</div>
            <div className="space-y-2">
              {g.members.length === 0 && <div className="text-sm text-gray-500">No members yet.</div>}
              {g.members.map(u => (
                <Link key={u.id} href={`/users/${u.id}`} className="flex items-center gap-3">
                  <img src={u.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.name || 'U')}`} alt={u.name} className="w-8 h-8 rounded-full border" />
                  <div>
                    <div className="text-sm font-medium">{u.name}</div>
                    <div className="text-xs text-gray-500">{u.job_title ? `${u.job_title} • ` : ''}{u.company}{u.subsidiary ? ` — ${u.subsidiary}` : ''}</div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        ))}
        {companies.map(([company, members]) => (
          <div key={company} className="bg-white border rounded p-4">
            <div className="font-medium mb-2">{company}</div>
            <div className="space-y-2">
              {members.slice(0, 12).map(u => (
                <Link key={u.id} href={`/users/${u.id}`} className="flex items-center gap-3">
                  <img src={u.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.name || 'U')}`} alt={u.name} className="w-8 h-8 rounded-full border" />
                  <div>
                    <div className="text-sm font-medium">{u.name}</div>
                    <div className="text-xs text-gray-500">{u.job_title || 'Member'}{u.subsidiary ? ` • ${u.subsidiary}` : ''}</div>
                  </div>
                </Link>
              ))}
              {members.length > 12 && (
                <div className="text-xs text-gray-500">and {members.length - 12} more…</div>
              )}
            </div>
          </div>
        ))}
      </div>
    </main>
  )
}


