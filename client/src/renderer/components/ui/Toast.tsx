import { createContext, useContext, useState, useCallback, ReactNode } from "react"

type ToastTone = "success" | "error" | "info"

interface Toast {
  id: number
  tone: ToastTone
  message: string
}

interface ToastContextValue {
  toast: (message: string, tone?: ToastTone) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

let nextId = 1

const toneStyles: Record<ToastTone, string> = {
  success: "border-[var(--color-success)]/40 text-[var(--color-success)]",
  error: "border-[var(--color-danger)]/40 text-[var(--color-danger)]",
  info: "border-[var(--color-border-strong)] text-[var(--color-content)]",
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const toast = useCallback((message: string, tone: ToastTone = "info") => {
    const id = nextId++
    setToasts((prev) => [...prev, { id, tone, message }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 4000)
  }, [])

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-[100] flex flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto min-w-[240px] max-w-sm rounded-lg border bg-[var(--color-surface-2)] px-4 py-3 text-sm shadow-[var(--shadow-pop)] ${toneStyles[t.tone]}`}
            style={{ animation: "toast-in 0.2s ease-out" }}
          >
            {t.message}
          </div>
        ))}
      </div>
      <style>{`@keyframes toast-in { from { opacity: 0; transform: translateX(16px) } to { opacity: 1; transform: none } }`}</style>
    </ToastContext.Provider>
  )
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error("useToast must be used within ToastProvider")
  return ctx
}
