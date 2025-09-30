import { ReactNode } from 'react'

export function Tabs({ tabs, active, onChange }: { tabs: { id: string; label: string }[]; active: string; onChange: (id: string) => void }) {
  return (
    <div className="border-b mb-4 flex gap-4">
      {tabs.map(t => (
        <button key={t.id} onClick={()=>onChange(t.id)} className={`pb-2 -mb-px border-b-2 ${active===t.id ? 'text-[var(--primary)]' : 'border-transparent text-gray-600'}`} style={active===t.id ? { borderColor: 'var(--primary)' } : undefined}>
          {t.label}
        </button>
      ))}
    </div>
  )
}

export function TabPanel({ active, id, children }: { active: string; id: string; children: ReactNode }) {
  if (active !== id) return null
  return <div>{children}</div>
}


