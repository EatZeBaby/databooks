import { useRouter } from 'next/router'
import useSWR from 'swr'
import Link from 'next/link'
import { apiGet } from '@/lib/api'
import Head from 'next/head'
import Avatar from '@/components/Avatar'

export default function UserProfile() {
  const { query } = useRouter()
  const id = query.id as string | undefined
  const { data: user } = useSWR<any>(id ? `/api/v1/users/${id}` : null, apiGet)
  const { data: activity } = useSWR<{ liked?: string[]; following?: string[] }>(id ? `/api/v1/users/${id}/activity` : null, apiGet)

  if (!id || !user) return <div className="p-6">Loading...</div>

  return (
    <main className="max-w-5xl mx-auto p-6 space-y-6">
      <Head><title>{user.name}</title></Head>
      <div className="flex items-start gap-4">
        <div className="w-16 h-16"><Avatar name={user.name} /></div>
        <div>
          <h1 className="text-2xl font-semibold">{user.name}</h1>
          <div className="text-sm text-gray-500">{user.job_title} • {user.company}{user.subsidiary ? ` — ${user.subsidiary}` : ''}</div>
          <div className="mt-1 text-xs text-gray-500">Tools: {(user.tools || []).join(', ')}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <section className="bg-white dark:bg-slate-900 border dark:border-gray-700 rounded p-4">
          <div className="font-medium mb-2">Liked datasets</div>
          <ul className="list-disc pl-5 text-sm">
            {(activity?.liked || []).map((ds: string) => (
              <li key={ds}><DatasetLink id={ds} /></li>
            ))}
            {(!activity?.liked || activity.liked.length === 0) && <li className="text-gray-500">No likes yet</li>}
          </ul>
        </section>
        <section className="bg-white dark:bg-slate-900 border dark:border-gray-700 rounded p-4">
          <div className="font-medium mb-2">Following</div>
          <ul className="list-disc pl-5 text-sm">
            {(activity?.following || []).map((ds: string) => (
              <li key={ds}><DatasetLink id={ds} /></li>
            ))}
            {(!activity?.following || activity.following.length === 0) && <li className="text-gray-500">Not following any dataset</li>}
          </ul>
        </section>
      </div>
    </main>
  )
}

function DatasetLink({ id }: { id: string }) {
  const { data } = useSWR<any>(id ? `/api/v1/datasets/${id}` : null, apiGet)
  const name = data?.name || id
  return <Link href={`/datasets/${id}`} className="dark:text-blue-400" style={{ color: 'var(--primary)' }}>{name}</Link>
}


