import useSWR from 'swr'
import Head from 'next/head'
import Link from 'next/link'
import { apiGet } from '@/lib/api'

type TagRow = { tag: string; count: number }

export default function TagsIndex() {
  const { data } = useSWR<{ data: TagRow[] }>(`/api/v1/tags`, apiGet)
  return (
    <main className="max-w-5xl mx-auto p-6 space-y-4">
      <Head><title>Tags</title></Head>
      <h1 className="text-2xl font-semibold">Tags</h1>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {data?.data?.map(t => (
          <Link key={t.tag} href={`/tags/${encodeURIComponent(t.tag)}`} className="bg-white border rounded p-3 hover:shadow flex items-center justify-between">
            <span>#{t.tag}</span>
            <span className="text-xs text-gray-500">{t.count}</span>
          </Link>
        ))}
      </div>
    </main>
  )
}


