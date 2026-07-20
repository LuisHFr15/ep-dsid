export interface TabItem {
  id: string
  label: string
  badge?: number
}

export function Tabs({
  items,
  active,
  onChange,
}: {
  items: TabItem[]
  active: string
  onChange: (id: string) => void
}) {
  return (
    <div className="flex gap-1 border-b border-[var(--color-border)]">
      {items.map((item) => {
        const isActive = item.id === active
        return (
          <button
            key={item.id}
            onClick={() => onChange(item.id)}
            className={`app-no-drag relative flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors ${
              isActive
                ? "text-[var(--color-content)]"
                : "text-[var(--color-muted)] hover:text-[var(--color-content)]"
            }`}
          >
            {item.label}
            {item.badge !== undefined && item.badge > 0 && (
              <span className="inline-flex min-w-[16px] items-center justify-center rounded-full bg-[var(--color-danger)] px-1 text-[10px] font-semibold leading-none text-white" style={{ height: 16 }}>
                {item.badge}
              </span>
            )}
            {isActive && (
              <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-[var(--color-accent)]" />
            )}
          </button>
        )
      })}
    </div>
  )
}
