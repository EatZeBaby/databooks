import Head from 'next/head'
import { useRouter } from 'next/router'
import useSWR from 'swr'
import Link from 'next/link'
import { apiGet } from '@/lib/api'
import { useMemo } from 'react'

function ActivityRow({ e, dsById, usersById }: { e: any; dsById: Record<string, any>; usersById: Record<string, any> }) {
  const dsId = e.dataset_id as string | undefined
  const userId = e.actor_id as string | undefined
  const { data: ds } = useSWR<any>(dsId && !dsById[dsId] ? `/api/v1/datasets/${dsId}` : null, apiGet)
  const { data: user } = useSWR<any>(userId && !usersById[userId] ? `/api/v1/users/${userId}` : null, apiGet)
  const dsName = dsById[dsId || '']?.name || ds?.name || dsId
  const actorName = usersById[userId || '']?.name || user?.name || userId
  return (
    <li key={e.id} className="border rounded p-3">
      <div className="text-xs text-gray-500">{new Date(e.created_at).toLocaleString()}</div>
      <div className="font-medium">{e.type}</div>
      {dsId && (
        <div>
          Dataset: <Link href={`/datasets/${dsId}`} className="text-blue-600">{dsName}</Link>
        </div>
      )}
      {userId && (
        <div>
          Actor: <Link href={`/users/${userId}`} className="text-blue-600">{actorName}</Link>
        </div>
      )}
    </li>
  )
}

export default function CompanyPage() {
  const { query } = useRouter()
  const company = query.company as string | undefined
  const { data } = useSWR<any>(company ? `/api/v1/companies/${encodeURIComponent(company)}` : null, apiGet)

  const dsById = useMemo(() => {
    const map: Record<string, any> = {}
    for (const d of (data?.datasets || [])) map[d.id] = d
    return map
  }, [data])

  const usersById = useMemo(() => {
    const map: Record<string, any> = {}
    for (const u of (data?.users || [])) map[u.id] = u
    return map
  }, [data])

  if (!company || !data) return <main className="max-w-6xl mx-auto p-6">Loading…</main>

  return (
    <main className="max-w-6xl mx-auto p-6 space-y-6">
      <Head><title>{data.company} – Company</title></Head>
      <h1 className="text-2xl font-semibold">{data.company}</h1>

      <section className="bg-white border rounded p-4">
        <div className="font-medium mb-2">Datasets</div>
        {(!data.datasets || data.datasets.length === 0) && <div className="text-sm text-gray-500">No datasets yet.</div>}
        <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {data.datasets?.map((d: any) => (
            <li key={d.id} className="border rounded p-3">
              <Link href={`/datasets/${d.id}`} className="font-medium">{d.name}</Link>
              <div className="text-xs text-gray-600 line-clamp-2">{d.description}</div>
              <div className="text-xs text-gray-500 mt-1">{d.visibility}</div>
            </li>
          ))}
        </ul>
      </section>

      <section className="bg-white border rounded p-4">
        <div className="font-medium mb-2">Users</div>
        {(!data.users || data.users.length === 0) && <div className="text-sm text-gray-500">No users yet.</div>}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {data.users?.map((u: any) => (
            <Link key={u.id} href={`/users/${u.id}`} className="border rounded p-3 flex items-center gap-3 hover:bg-gray-50">
              <img src={u.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.name || 'U')}`} alt={u.name} className="w-10 h-10 rounded-full border" />
              <div>
                <div className="text-sm font-medium">{u.name}</div>
                <div className="text-xs text-gray-500">{u.job_title || 'Member'}{u.subsidiary ? ` • ${u.subsidiary}` : ''}</div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="bg-white border rounded p-4">
        <div className="font-medium mb-2">Recent activity</div>
        {(!data.activity || data.activity.length === 0) && <div className="text-sm text-gray-500">No activity yet.</div>}
        <ul className="space-y-2 text-sm">
          {data.activity?.map((e: any) => (
            <ActivityRow key={e.id} e={e} dsById={dsById} usersById={usersById} />
          ))}
        </ul>
      </section>
    </main>
  )
}
