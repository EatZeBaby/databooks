import useSWR from 'swr'
import Head from 'next/head'
import Link from 'next/link'
import { useMemo, useState } from 'react'
import { apiGet } from '@/lib/api'
import type { PaginatedDatasets } from '@/types/api'
import useSWRInfinite from 'swr/infinite'
import { motion } from 'framer-motion'

export default function DatasetsList() {
  const [query, setQuery] = useState('')
  const pageSize = 24
  const getKey = (index: number) => `/api/v1/datasets?page=${index + 1}&per_page=${pageSize}&query=${encodeURIComponent(query)}`
  const { data, size, setSize, isValidating } = useSWRInfinite<PaginatedDatasets>(getKey, apiGet, { revalidateFirstPage: true })
  const flat = useMemo(() => (data ? data.flatMap(p => p.data) : []), [data])
  const total = data?.[0]?.total || 0
  const container = {
    show: { transition: { staggerChildren: 0.06 } },
  }
  const item = {
    hidden: { opacity: 0, y: 8 },
    show: { opacity: 1, y: 0 },
  }
  const isLoading = !data
  const canLoadMore = flat.length < total

  return (
    <main className="max-w-6xl mx-auto p-6 space-y-4">
      <Head>
        <title>Datasets</title>
      </Head>
      <h1 className="text-2xl font-semibold">Datasets</h1>
      <div className="flex gap-2">
        <input value={query} onChange={(e)=>setQuery(e.target.value)} placeholder="Search datasets" className="border rounded p-2 w-full" />
      </div>
      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white border rounded p-4 animate-pulse">
              <div className="h-4 w-1/2 bg-gray-200 rounded" />
              <div className="mt-2 h-3 w-full bg-gray-100 rounded" />
              <div className="mt-1 h-3 w-5/6 bg-gray-100 rounded" />
              <div className="mt-3 h-3 w-1/3 bg-gray-100 rounded" />
            </div>
          ))}
        </div>
      )}
      <motion.div
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
        variants={container}
        initial="hidden"
        animate="show"
      >
        {flat.map(ds => (
          <motion.div
            key={ds.id}
            variants={item}
            whileHover={{ y: -2 }}
            transition={{ type: 'spring', stiffness: 300, damping: 24 }}
          >
            <Link href={`/datasets/${ds.id}`} className="block bg-white border rounded surface p-4 hover:shadow-lg transition-shadow">
              <div className="font-medium">{ds.name}</div>
              <div className="text-sm text-gray-600 line-clamp-2">{ds.description}</div>
              {Array.isArray((ds as any).tags) && (ds as any).tags.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {(ds as any).tags.slice(0, 6).map((t: string) => (
                    <Link key={t} href={`/tags/${encodeURIComponent(t)}`} className="text-xs px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">#{t}</Link>
                  ))}
                </div>
              )}
              <div className="text-xs text-gray-500 mt-2">{ds.visibility}</div>
            </Link>
          </motion.div>
        ))}
      </motion.div>
      <div className="flex justify-center py-4">
        {canLoadMore && (
          <button onClick={()=>setSize(size + 1)} className="px-4 py-2 text-white rounded" style={{ background: 'var(--primary)' }} disabled={isValidating}>Load more</button>
        )}
      </div>
    </main>
  )
}


