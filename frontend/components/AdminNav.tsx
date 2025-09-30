import Link from 'next/link'
import { useRouter } from 'next/router'

const linkBase = 'px-3 py-1.5 rounded border dark:border-gray-700'

export default function AdminNav() {
  const { pathname } = useRouter()
  return (
    <div className="flex gap-2 mb-4">
      <Link href="/admin/settings" className={`${linkBase} ${pathname.includes('/admin/settings') ? 'text-white' : 'bg-white dark:bg-slate-900'}`} style={pathname.includes('/admin/settings') ? { background: 'var(--primary)' } : undefined}>Settings</Link>
      <Link href="/admin/users" className={`${linkBase} ${pathname.includes('/admin/users') ? 'text-white' : 'bg-white dark:bg-slate-900'}`} style={pathname.includes('/admin/users') ? { background: 'var(--primary)' } : undefined}>Users</Link>
    </div>
  )
}



