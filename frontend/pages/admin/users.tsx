import { useState } from 'react'
import AdminNav from '@/components/AdminNav'
import useSWR from 'swr'
import Link from 'next/link'
import { apiGet } from '@/lib/api'

export default function AdminUsers() {
  const { data, mutate } = useSWR<any>('/api/v1/users', apiGet)
  const users = data?.data || []
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [avatar, setAvatar] = useState('')
  const [jobTitle, setJobTitle] = useState('')
  const [company, setCompany] = useState('')
  const [subsidiary, setSubsidiary] = useState('')
  const [status, setStatus] = useState('')

  const createUser = async (e: React.FormEvent) => {
    e.preventDefault()
    setStatus('')
    const body = { name, email, avatar_url: avatar, job_title: jobTitle, company, subsidiary }
    const base = process.env.NEXT_PUBLIC_API_BASE || ''
    const res = await fetch(`${base}/api/v1/admin/users`, { method: 'POST', headers: { 'Content-Type':'application/json' }, body: JSON.stringify(body) })
    if (!res.ok) { setStatus(`Failed: ${res.status}`); return }
    const u = await res.json()
    setStatus(`Created user ${u.name} (${u.id})`)
    mutate()
    setName(''); setEmail(''); setAvatar(''); setJobTitle(''); setCompany(''); setSubsidiary('')
  }

  return (
    <main className="max-w-3xl mx-auto p-6 space-y-4">
      <AdminNav />
      <h1 className="text-2xl font-semibold">Admin — Users</h1>
      <form onSubmit={createUser} className="bg-white border rounded p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm mb-1">Name</label>
          <input value={name} onChange={e=>setName(e.target.value)} className="border rounded p-2 w-full" required />
        </div>
        <div>
          <label className="block text-sm mb-1">Email</label>
          <input type="email" value={email} onChange={e=>setEmail(e.target.value)} className="border rounded p-2 w-full" />
        </div>
        <div>
          <label className="block text-sm mb-1">Avatar URL</label>
          <input value={avatar} onChange={e=>setAvatar(e.target.value)} className="border rounded p-2 w-full" />
        </div>
        <div>
          <label className="block text-sm mb-1">Job Title</label>
          <input value={jobTitle} onChange={e=>setJobTitle(e.target.value)} className="border rounded p-2 w-full" />
        </div>
        <div>
          <label className="block text-sm mb-1">Company</label>
          <input value={company} onChange={e=>setCompany(e.target.value)} className="border rounded p-2 w-full" />
        </div>
        <div>
          <label className="block text-sm mb-1">Subsidiary</label>
          <input value={subsidiary} onChange={e=>setSubsidiary(e.target.value)} className="border rounded p-2 w-full" />
        </div>
        <div className="md:col-span-2">
          <button className="px-4 py-2 text-white rounded" style={{ background: 'var(--primary)' }} type="submit">Create</button>
        </div>
      </form>
      {status && <div className="text-sm text-gray-600 dark:text-gray-300">{status}</div>}

      <section className="bg-white border rounded p-4">
        <div className="font-medium mb-2">All users</div>
        <div className="text-sm text-gray-500 mb-2">Click a user to edit in place.</div>
        <table className="min-w-full text-sm">
          <thead className="text-left text-gray-500">
            <tr>
              <th className="py-2 pr-4">Name</th>
              <th className="py-2 pr-4">Email</th>
              <th className="py-2 pr-4">Title</th>
              <th className="py-2 pr-4">Company</th>
              <th className="py-2 pr-4">Profile</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u:any)=> (
              <tr key={u.id} className="border-t">
                <td className="py-2 pr-4">{u.name}</td>
                <td className="py-2 pr-4">{u.email}</td>
                <td className="py-2 pr-4">{u.job_title}</td>
                <td className="py-2 pr-4">{u.company}</td>
                <td className="py-2 pr-4"><Link href={`/users/${u.id}`} className="dark:text-blue-400" style={{ color: 'var(--primary)' }}>View</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="bg-white border rounded p-4">
        <div className="font-medium mb-2">Bulk create fake users</div>
        <div className="flex items-center gap-2">
          <input type="number" min={1} defaultValue={20} id="bulkCount" className="border rounded p-2 w-24" />
          <button onClick={async()=>{
            const base = process.env.NEXT_PUBLIC_API_BASE || ''
            const count = (document.getElementById('bulkCount') as HTMLInputElement).value || '20'
            const res = await fetch(`${base}/api/v1/admin/users/bulk?count=${encodeURIComponent(count)}`, { method: 'POST' })
            if (res.ok) { const j = await res.json(); setStatus(`Bulk created ${j.created} users`); mutate() } else { setStatus(`Bulk failed: ${res.status}`) }
          }} className="px-4 py-2 text-white rounded" style={{ background: 'var(--primary)' }}>Run</button>
        </div>
      </section>
    </main>
  )
}


