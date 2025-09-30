import { createContext, useContext, useState, ReactNode, useCallback } from 'react'

type Toast = { id: number; message: string; type?: 'success'|'info'|'warning'|'error' };
type ToastContextType = { show: (message: string, type?: Toast['type']) => void };

const ToastContext = createContext<ToastContextType>({ show: () => {} })

export function useToast() { return useContext(ToastContext) }

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const show = useCallback((message: string, type?: Toast['type']) => {
    const id = Date.now() + Math.random()
    setToasts(t => [...t, { id, message, type }])
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 2500)
  }, [])
  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 space-y-2">
        {toasts.map(t => (
          <div key={t.id} className={`px-3 py-2 rounded shadow text-white text-sm ${
            t.type === 'success' ? 'bg-green-600' : t.type === 'warning' ? 'bg-amber-600' : t.type === 'error' ? 'bg-red-600' : 'bg-gray-900'
          }`}>{t.message}</div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}


