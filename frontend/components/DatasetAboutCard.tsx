import { apiPost } from '@/lib/api'
import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useToast } from '@/components/Toast'

export default function DatasetAboutCard({
  id,
  name,
  description,
  createdAt,
  source,
  social,
  onChanged,
  showActions = false,
  addressFullName,
  systemName,
  cloudProvider,
  ownerEmail,
  lastRefreshAt,
}: {
  id: string
  name: string
  description?: string
  createdAt: string
  source: Record<string, any>
  social?: { followers?: number; likes?: number }
  onChanged?: () => void
  showActions?: boolean
  addressFullName?: string
  systemName?: string
  cloudProvider?: string
  ownerEmail?: string
  lastRefreshAt?: string | number
}) {
  const birthplace = source?.catalog ? `Databricks UC • ${source.catalog}.${source.schema}` : 'Unknown'
  const birthday = new Date(createdAt).toLocaleDateString()
  const lastRef = lastRefreshAt ? new Date(Number(lastRefreshAt)).toLocaleString() : undefined
  const [showDesc, setShowDesc] = useState(false)
  const { show } = useToast()

  const toggleFollow = async () => {
    await apiPost('/api/v1/follows', { dataset_id: id, follow: true })
    onChanged && onChanged()
    show('Followed dataset', 'success')
  }

  const toggleLike = async () => {
    await apiPost('/api/v1/likes', { dataset_id: id, follow: true })
    onChanged && onChanged()
    show('Liked dataset', 'success')
  }

  return (
    <aside className="space-y-4">
      <div className="bg-white border rounded p-4">
        <div className="flex items-center justify-between mb-1">
          <div className="font-medium">About</div>
          {description && (
            <button
              onClick={()=>setShowDesc(v=>!v)}
              className="text-xs px-2 py-1 border rounded hover:bg-gray-50"
            >{showDesc ? 'Hide' : 'Show'}</button>
          )}
        </div>
        <AnimatePresence initial={false}>
          {(showDesc || !description) && (
            <motion.div
              key="desc"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="text-sm text-gray-600 overflow-hidden"
            >
              {description || 'No description provided.'}
            </motion.div>
          )}
        </AnimatePresence>
        <dl className="mt-4 text-sm">
          {addressFullName && (
            <div className="flex justify-between py-1">
              <dt className="text-gray-500">Address</dt>
              <dd className="font-medium truncate max-w-[60%] text-right" title={addressFullName}>{addressFullName}</dd>
            </div>
          )}
          {systemName && (
            <div className="flex justify-between py-1">
              <dt className="text-gray-500">City, State</dt>
              <dd className="font-medium">{systemName}</dd>
            </div>
          )}
          {cloudProvider && (
            <div className="flex justify-between py-1">
              <dt className="text-gray-500">Postcode</dt>
              <dd className="font-medium">{cloudProvider}</dd>
            </div>
          )}
          <div className="flex justify-between py-1">
            <dt className="text-gray-500">Birthday</dt>
            <dd className="font-medium">{birthday}</dd>
          </div>
          <div className="flex justify-between py-1">
            <dt className="text-gray-500">Birthplace</dt>
            <dd className="font-medium">{birthplace}</dd>
          </div>
          {ownerEmail && (
            <div className="flex justify-between py-1">
              <dt className="text-gray-500">Email</dt>
              <dd className="font-medium truncate max-w-[60%] text-right" title={ownerEmail}>{ownerEmail}</dd>
            </div>
          )}
          {lastRef && (
            <div className="flex justify-between py-1">
              <dt className="text-gray-500">Last refresh</dt>
              <dd className="font-medium">{lastRef}</dd>
            </div>
          )}
          <div className="flex justify-between py-1">
            <dt className="text-gray-500">Followers</dt>
            <dd className="font-medium">{social?.followers ?? 0}</dd>
          </div>
          <div className="flex justify-between py-1">
            <dt className="text-gray-500">Likes</dt>
            <dd className="font-medium">{social?.likes ?? 0}</dd>
          </div>
        </dl>
        {showActions && (
          <div className="flex gap-2 mt-4">
            <button onClick={toggleFollow} className="px-3 py-1.5 border rounded hover:bg-gray-50">Follow</button>
            <button onClick={toggleLike} className="px-3 py-1.5 bg-pink-600 text-white rounded hover:bg-pink-700">Like</button>
          </div>
        )}
      </div>
    </aside>
  )
}


