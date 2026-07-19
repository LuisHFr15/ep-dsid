import { ReactNode } from "react"

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode
  title: string
  description?: string
  action?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-[var(--color-border)] px-6 py-14 text-center">
      {icon && <div className="text-3xl opacity-60">{icon}</div>}
      <div>
        <p className="font-medium text-[var(--color-content)]">{title}</p>
        {description && <p className="mt-1 text-sm text-[var(--color-muted)]">{description}</p>}
      </div>
      {action}
    </div>
  )
}
