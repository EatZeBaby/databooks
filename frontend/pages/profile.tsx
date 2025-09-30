import useSWR from 'swr'
import Head from 'next/head'
import { apiGet } from '@/lib/api'
import Link from 'next/link'
import { useEffect, useState } from 'react'

type PlatformProfile = { user_id?: string; platform_type: 'snowflake' | 'databricks' | 'bigquery' | 'redshift'; config_json: Record<string, any>; id?: string }

export default function ProfilePage() {
  const { data: profile, mutate } = useSWR<PlatformProfile>('/api/v1/users/me/profile', apiGet)
  const { data: me } = useSWR<any>('/api/v1/users/me', apiGet)
  const { data: social } = useSWR<{ following: string[]; liked: string[] }>('/api/v1/users/me/social', apiGet)
  const [platformType, setPlatformType] = useState<PlatformProfile['platform_type']>('snowflake')
  const [database, setDatabase] = useState('ANALYTICS')
  const [schema, setSchema] = useState('PUBLIC')
  const [project, setProject] = useState('')
  const [dataset, setDataset] = useState('')
  const [name, setName] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')
  const [tools, setTools] = useState<string[]>([])

  useEffect(() => {
    if (profile) {
      setPlatformType(profile.platform_type)
      setDatabase((profile.config_json as any)?.database || 'ANALYTICS')
      setSchema((profile.config_json as any)?.schema || 'PUBLIC')
      setProject((profile.config_json as any)?.project || '')
      setDataset((profile.config_json as any)?.dataset || '')
    }
    if (me) {
      setName(me.name || '')
      setAvatarUrl(me.avatar_url || '')
      setTools(me.tools || [])
    }
  }, [profile, me])

  const onSave = async (e: React.FormEvent) => {
    e.preventDefault()
    const config: Record<string, any> = {}
    if (platformType === 'snowflake') { config.database = database; config.schema = schema }
    if (platformType === 'bigquery') { config.project = project; config.dataset = dataset }
    const body = { platform_type: platformType, config_json: config }
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE || ''}/api/v1/users/me/profile`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    if (!res.ok) throw new Error('Failed to save')
    await mutate()
  }

  return (
    <main className="max-w-4xl mx-auto p-6 space-y-6">
      <Head><title>Profile</title></Head>
      <h1 className="text-2xl font-semibold">My Profile</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 bg-white border rounded p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm mb-1">Name</label>
              <input className="border rounded p-2 w-full" value={name} onChange={e=>setName(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm mb-1">Avatar URL</label>
              <input className="border rounded p-2 w-full" value={avatarUrl} onChange={e=>setAvatarUrl(e.target.value)} />
            </div>
          </div>
          <div>
            <label className="block text-sm mb-1">Tools</label>
            <div className="flex gap-2 text-sm">
              {['databricks','snowflake','bigquery','redshift'].map(t => (
                <label key={t} className="inline-flex items-center gap-1">
                  <input type="checkbox" checked={tools.includes(t)} onChange={(e)=>{
                    if (e.target.checked) setTools([...tools, t])
                    else setTools(tools.filter(x=>x!==t))
                  }} /> {t}
                </label>
              ))}
            </div>
          </div>
          <button onClick={async()=>{
            await fetch(`${process.env.NEXT_PUBLIC_API_BASE || ''}/api/v1/users/me`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, avatar_url: avatarUrl, tools }) })
          }} className="px-4 py-2 text-white rounded" style={{ background: 'var(--primary)' }}>Save Profile</button>
        </div>
        <div className="bg-white border rounded p-4">
          <div className="font-medium mb-2">Following</div>
          <ul className="list-disc pl-5 text-sm">
            {social?.following?.map(id => <li key={id}><DatasetLink id={id} /></li>)}
          </ul>
          <div className="font-medium mt-4 mb-2">Liked</div>
          <ul className="list-disc pl-5 text-sm">
            {social?.liked?.map(id => <li key={id}><DatasetLink id={id} /></li>)}
          </ul>
        </div>
      </div>
      <form onSubmit={onSave} className="bg-white border rounded p-4 space-y-4">
        <div>
          <label className="block text-sm mb-1">Platform</label>
          <select value={platformType} onChange={(e)=>setPlatformType(e.target.value as any)} className="border rounded p-2">
            <option value="snowflake">Snowflake</option>
            <option value="databricks">Databricks</option>
            <option value="bigquery">BigQuery</option>
            <option value="redshift">Redshift</option>
          </select>
        </div>
        {platformType === 'snowflake' && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm mb-1">Database</label>
              <input className="border rounded p-2 w-full" value={database} onChange={e=>setDatabase(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm mb-1">Schema</label>
              <input className="border rounded p-2 w-full" value={schema} onChange={e=>setSchema(e.target.value)} />
            </div>
          </div>
        )}
        {platformType === 'bigquery' && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm mb-1">Project</label>
              <input className="border rounded p-2 w-full" value={project} onChange={e=>setProject(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm mb-1">Dataset</label>
              <input className="border rounded p-2 w-full" value={dataset} onChange={e=>setDataset(e.target.value)} />
            </div>
          </div>
        )}
        <button className="px-4 py-2 text-white rounded" style={{ background: 'var(--primary)' }} type="submit">Save</button>
      </form>
    </main>
  )
}

function DatasetLink({ id }: { id: string }) {
  const { data } = useSWR<any>(id ? `/api/v1/datasets/${id}` : null, apiGet)
  const name = data?.name || id
  return <Link href={`/datasets/${id}`} className="text-blue-600 dark:text-blue-400">{name}</Link>
}


