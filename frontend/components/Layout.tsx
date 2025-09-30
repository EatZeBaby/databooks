import Link from 'next/link'
import { ReactNode, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/router'
import { Home, Database, Users, Plug, Star, Heart, Menu, ChevronLeft, Settings } from 'lucide-react'

export default function Layout({ children }: { children: ReactNode }) {
  const router = useRouter()
  const [scrolled, setScrolled] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 'b' || e.key === 'B')) {
        const target = e.target as HTMLElement | null
        const tag = target?.tagName?.toLowerCase()
        if (tag === 'input' || tag === 'textarea') return
        e.preventDefault()
        setCollapsed(v => !v)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
  const navItems = useMemo(() => ([
    { href: '/', label: 'Feed', Icon: Home },
    { href: '/datasets', label: 'Datasets', Icon: Database },
    { href: '/companies', label: 'Companies', Icon: Users },
    { href: '/groups', label: 'Groups/Teams', Icon: Users },
    { href: '/connectors', label: 'Connectors', Icon: Plug },
    { href: '/favorites', label: 'Favorites', Icon: Star },
    { href: '/profile', label: 'Following', Icon: Heart },
  ]), [])
  return (
    <div className="flex">
      <aside className={`hidden md:flex flex-col border-r bg-white dark:bg-slate-900 dark:border-gray-700 h-screen sticky top-0 ${collapsed ? 'w-[64px]' : 'w-[220px]'} transition-[width]`}>
        <div className="flex items-center gap-2 px-3 h-14 border-b dark:border-gray-700">
          <button onClick={()=>setCollapsed(v=>!v)} className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800" aria-label="Toggle sidebar">
            {collapsed ? <Menu size={18} /> : <ChevronLeft size={18} />}
          </button>
          {!collapsed && <Link href="/" className="font-semibold">Databooks</Link>}
        </div>
        <nav className="p-2 text-sm flex-1 overflow-y-auto">
          {navItems.map(({ href, label, Icon }) => {
            const active = router.asPath === href || router.asPath.startsWith(href + '/')
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? 'page' : undefined}
                className={`group flex items-center gap-3 px-3 py-2 rounded ${collapsed ? 'justify-center' : ''} ${active ? 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100' : 'hover:bg-gray-100 dark:hover:bg-gray-800'}`}
              >
                <Icon size={18} className={active ? 'text-[var(--primary)]' : 'text-gray-600'} />
                {!collapsed && <span>{label}</span>}
              </Link>
            )
          })}
        </nav>
        <div className="mt-auto p-2 border-t dark:border-gray-700">
          <Link href="/admin/settings" className={`group flex items-center gap-3 px-3 py-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800 ${collapsed ? 'justify-center' : ''}`}>
            <Settings size={18} className="text-gray-600" />
            {!collapsed && <span>Admin settings</span>}
          </Link>
        </div>
      </aside>
      <div className="flex-1 min-w-0">
        <header className={`bg-white border-b sticky top-0 z-30 transition-shadow ${scrolled ? 'shadow-sm' : ''}`}>
          <nav className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-4">
            <div className="font-semibold md:hidden"><Link href="/">DataMesh Social</Link></div>
            <div className="ml-auto flex items-center gap-2 text-sm">
              <Link href="/publish" className="px-2 py-1 text-white rounded" style={{ background: 'var(--primary)' }}>Publish</Link>
              <NavLink href="/datasets">Browse</NavLink>
            </div>
          </nav>
        </header>
        <div className="min-h-[calc(100vh-56px)] max-w-screen-2xl px-4">{children}</div>
      </div>
    </div>
  )
}

function NavLink({ href, children }: { href: string; children: ReactNode }) {
  const router = useRouter()
  const active = router.asPath === href || router.asPath.startsWith(href + '/')
  return (
    <Link href={href} className="relative group">
      <span className={`hover:text-gray-900 ${active ? 'text-gray-900' : ''}`}>{children}</span>
      <span className={`absolute left-0 right-0 -bottom-1 h-0.5 origin-left transition-transform duration-200 ${active ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-100'}`} style={{ background: 'var(--primary)' }} />
    </Link>
  )
}


