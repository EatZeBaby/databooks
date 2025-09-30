import Head from 'next/head'
import { useRouter } from 'next/router'
import { motion } from 'framer-motion'
import { useState } from 'react'

export default function LoginPage() {
  const router = useRouter()
  const [leaving, setLeaving] = useState(false)
  return (
    <main className="min-h-screen flex items-center justify-center" style={{ background: 'var(--oat-light)' }}>
      <Head><title>Login</title></Head>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: leaving ? 0 : 1, y: leaving ? -8 : 0 }}
        transition={{ duration: 0.25 }}
        className="text-center p-8"
      >
        <div className="text-3xl font-semibold mb-2">Databooks</div>
        <div className="mb-6 text-sm text-gray-600">the first social network for your data</div>
        <button
          onClick={()=>{ try { localStorage.setItem('dbx_first_launch_done','1') } catch {}; setLeaving(true); setTimeout(()=>router.push('/'), 260) }}
          className="px-6 py-2 text-white rounded"
          style={{ background: 'var(--primary)' }}
        >
          Login
        </button>
      </motion.div>
    </main>
  )
}
