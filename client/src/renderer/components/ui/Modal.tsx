import { ReactNode } from "react"

export function Modal({
  title,
  onClose,
  children,
}: {
  title: string
  onClose: () => void
  children: ReactNode
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        className="w-full max-w-md rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-pop)]"
        style={{ animation: "modal-in 0.15s ease-out" }}
      >
        <div className="flex items-center justify-between border-b border-[var(--color-border)] px-5 py-4">
          <h2 className="text-base font-semibold">{title}</h2>
          <button
            onClick={onClose}
            className="app-no-drag text-[var(--color-muted)] transition-colors hover:text-[var(--color-content)]"
            aria-label="fechar"
          >
            ✕
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
      <style>{`@keyframes modal-in { from { opacity: 0; transform: translateY(8px) scale(0.98) } to { opacity: 1; transform: none } }`}</style>
    </div>
  )
}
