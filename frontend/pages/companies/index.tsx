import useSWR from 'swr'
import Head from 'next/head'
import Link from 'next/link'
import { apiGet } from '@/lib/api'

export default function CompaniesIndex() {
  const { data } = useSWR<{ companies: Array<{ name: string; count: number }> }>(`/api/v1/companies`, apiGet)
  const items = data?.companies || []
  return (
    <main className="max-w-4xl mx-auto p-6 space-y-6">
      <Head><title>Companies</title></Head>
      <h1 className="text-2xl font-semibold">Companies</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {items.map(c => (
          <Link key={c.name} href={`/companies/${encodeURIComponent(c.name)}`} className="bg-white border rounded p-4 hover:bg-gray-50">
            <div className="font-medium">{c.name}</div>
            <div className="text-xs text-gray-500">{c.count} users</div>
          </Link>
        ))}
        {items.length === 0 && (
          <div className="text-sm text-gray-500">No companies found.</div>
        )}
      </div>
    </main>
  )
}
