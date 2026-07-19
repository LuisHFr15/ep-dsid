import { ButtonHTMLAttributes } from "react"
import { Spinner } from "./Spinner"

type Variant = "primary" | "ghost" | "danger" | "subtle"

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  loading?: boolean
  size?: "sm" | "md"
}

const base =
  "app-no-drag inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] disabled:opacity-50 disabled:cursor-not-allowed"

const variants: Record<Variant, string> = {
  primary: "bg-[var(--color-accent)] text-white hover:bg-[var(--color-accent-hover)]",
  ghost: "text-[var(--color-muted)] hover:text-[var(--color-content)] hover:bg-[var(--color-surface-2)]",
  danger: "bg-[var(--color-danger)] text-white hover:opacity-90",
  subtle: "bg-[var(--color-surface-2)] text-[var(--color-content)] border border-[var(--color-border)] hover:border-[var(--color-border-strong)]",
}

const sizes = {
  sm: "px-2.5 py-1 text-xs",
  md: "px-4 py-2 text-sm",
}

export function Button({
  variant = "primary",
  loading = false,
  size = "md",
  className = "",
  children,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <Spinner size={14} />}
      {children}
    </button>
  )
}
