import { HTMLAttributes } from "react"

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  interactive?: boolean
}

export function Card({ interactive = false, className = "", children, ...props }: CardProps) {
  return (
    <div
      className={`rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 ${
        interactive
          ? "cursor-pointer transition-colors hover:border-[var(--color-border-strong)] hover:bg-[var(--color-surface-2)]"
          : ""
      } ${className}`}
      {...props}
    >
      {children}
    </div>
  )
}
