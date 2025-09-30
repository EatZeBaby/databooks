import { useEffect, useState } from 'react'
import AdminNav from '@/components/AdminNav'

type ThemeState = {
  mode: 'light' | 'dark'
  primary: string
  accent: string
}

const DEFAULT_THEME: ThemeState = { mode: 'light', primary: '#FF3621', accent: '#FF3621' }

export default function AdminSettings() {
  const [theme, setTheme] = useState<ThemeState>(DEFAULT_THEME)
  const [seedUsers, setSeedUsers] = useState<number>(8)
  const [seedInteractions, setSeedInteractions] = useState<number>(50)
  const [seedStatus, setSeedStatus] = useState<string>("")
  const [seeding, setSeeding] = useState<boolean>(false)

  useEffect(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('appTheme') : null
    if (saved) {
      try { setTheme(JSON.parse(saved)) } catch {}
    }
  }, [])

  const applyTheme = (t: ThemeState) => {
    if (typeof document === 'undefined') return
    const root = document.documentElement
    root.style.setProperty('--primary', t.primary)
    root.style.setProperty('--accent', t.accent)
    root.classList.toggle('dark', t.mode === 'dark')
  }

  const onSave = () => {
    localStorage.setItem('appTheme', JSON.stringify(theme))
    applyTheme(theme)
  }

  const onReset = () => {
    setTheme(DEFAULT_THEME)
    localStorage.removeItem('appTheme')
    applyTheme(DEFAULT_THEME)
  }

  const runSeed = async () => {
    try {
      setSeeding(true)
      setSeedStatus('')
      const base = process.env.NEXT_PUBLIC_API_BASE || ''
      const url = `${base}/api/v1/admin/seed?users=${encodeURIComponent(seedUsers)}&interactions=${encodeURIComponent(seedInteractions)}`
      const res = await fetch(url, { method: 'POST' })
      if (!res.ok) throw new Error(`Seed failed: ${res.status}`)
      const json = await res.json()
      setSeedStatus(`Created users: ${json.users}, events: ${json.events}, likes: ${json.likes}, follows: ${json.follows}`)
    } catch (e: any) {
      setSeedStatus(e.message || String(e))
    } finally {
      setSeeding(false)
    }
  }

  return (
    <main className="max-w-3xl mx-auto p-6 space-y-6">
      <AdminNav />
      <h1 className="text-2xl font-semibold">Admin — Appearance</h1>
      <section className="bg-white border rounded p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm mb-1">Theme mode</label>
            <select value={theme.mode} onChange={e=>setTheme({ ...theme, mode: e.target.value as any })} className="border rounded p-2 w-full">
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </select>
          </div>
          <div>
            <label className="block text-sm mb-1">Primary color</label>
            <input type="color" value={theme.primary} onChange={e=>setTheme({ ...theme, primary: e.target.value })} className="w-16 h-10 p-0 border rounded" />
            <input value={theme.primary} onChange={e=>setTheme({ ...theme, primary: e.target.value })} className="ml-2 border rounded p-2 w-32 align-middle" />
          </div>
          <div>
            <label className="block text-sm mb-1">Accent color</label>
            <input type="color" value={theme.accent} onChange={e=>setTheme({ ...theme, accent: e.target.value })} className="w-16 h-10 p-0 border rounded" />
            <input value={theme.accent} onChange={e=>setTheme({ ...theme, accent: e.target.value })} className="ml-2 border rounded p-2 w-32 align-middle" />
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={onSave} className="px-4 py-2 text-white rounded" style={{ background: 'var(--primary)' }}>Save</button>
          <button onClick={onReset} className="px-4 py-2 border rounded">Reset</button>
        </div>
      </section>
      <section className="bg-white border rounded p-4">
        <div className="font-medium mb-2">Preview</div>
        <div className="flex gap-3 items-center">
          <button className="px-4 py-2 text-white rounded" style={{ background: 'var(--primary)' }}>Primary (Connect)</button>
          <button className="px-4 py-2 border rounded">Secondary</button>
          <span className="px-2 py-1 rounded text-white" style={{ background: 'var(--accent)' }}>Accent</span>
        </div>
      </section>

      <section className="bg-white border rounded p-4 space-y-4">
        <div className="font-medium">Demo data seeding</div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div>
            <label className="block mb-1">Users</label>
            <input type="number" min={1} value={seedUsers} onChange={e=>setSeedUsers(parseInt(e.target.value || '0'))} className="border rounded p-2 w-full" />
          </div>
          <div>
            <label className="block mb-1">Interactions</label>
            <input type="number" min={1} value={seedInteractions} onChange={e=>setSeedInteractions(parseInt(e.target.value || '0'))} className="border rounded p-2 w-full" />
          </div>
          <div className="flex items-end">
            <button onClick={runSeed} disabled={seeding} className="px-4 py-2 bg-blue-600 text-white rounded">{seeding ? 'Seeding…' : 'Generate'}</button>
          </div>
        </div>
        {seedStatus && (<div className="text-sm text-gray-600 dark:text-gray-300">{seedStatus}</div>)}
      </section>
    </main>
  )
}


