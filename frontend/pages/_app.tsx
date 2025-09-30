import type { AppProps } from 'next/app'
import '@/styles/globals.css'
import Layout from '@/components/Layout'
import { AnimatePresence, motion } from 'framer-motion'
import { useRouter } from 'next/router'
import { ToastProvider } from '@/components/Toast'
import { useEffect, useState } from 'react'

export default function App({ Component, pageProps }: AppProps) {
  const router = useRouter()
  const [showSplash, setShowSplash] = useState(false)
  const [ready, setReady] = useState(false)
  if (typeof window !== 'undefined') {
    try {
      const saved = localStorage.getItem('appTheme')
      if (saved) {
        const t = JSON.parse(saved)
        const root = document.documentElement
        if (t.mode === 'dark') root.classList.add('dark'); else root.classList.remove('dark')
        if (t.primary) root.style.setProperty('--primary', t.primary)
        if (t.accent) root.style.setProperty('--accent', t.accent)
      }
    } catch {}
  }
  const isLogin = router.pathname === '/login'
  useEffect(() => {
    try {
      const seen = localStorage.getItem('dbx_first_launch_done')
      setShowSplash(!seen && !isLogin)
    } catch { setShowSplash(false) }
    const t = setTimeout(() => setReady(true), 0)
    return () => clearTimeout(t)
  }, [isLogin])
  if (!ready) return null
  if (showSplash) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--oat-light)' }}>
        <AnimatePresence>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }} className="text-center p-8">
            <div className="text-3xl font-semibold mb-2">Databooks</div>
            <div className="mb-6 text-sm text-gray-600">the first social network for your data</div>
            <button
              onClick={()=>{ try { localStorage.setItem('dbx_first_launch_done','1') } catch {}; setShowSplash(false) }}
              className="px-6 py-2 text-white rounded"
              style={{ background: 'var(--primary)' }}
            >
              Login
            </button>
          </motion.div>
        </AnimatePresence>
      </div>
    )
  }
  if (isLogin) {
    return (
      <ToastProvider>
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={router.asPath}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18 }}
          >
            <Component {...pageProps} />
          </motion.div>
        </AnimatePresence>
      </ToastProvider>
    )
  }
  return (
    <ToastProvider>
      <Layout>
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={router.asPath}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18 }}
          >
            <Component {...pageProps} />
          </motion.div>
        </AnimatePresence>
      </Layout>
    </ToastProvider>
  )
}


