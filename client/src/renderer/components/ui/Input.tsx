import { InputHTMLAttributes, forwardRef } from "react"

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, className = "", id, ...props },
  ref,
) {
  const field = (
    <input
      ref={ref}
      id={id}
      className={`w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2 text-sm text-[var(--color-content)] placeholder:text-[var(--color-faint)] transition-colors focus:border-[var(--color-accent)] focus:outline-none ${className}`}
      {...props}
    />
  )

  if (!label) return field

  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-[var(--color-muted)]">{label}</span>
      {field}
    </label>
  )
})
