type Tone = "neutral" | "accent" | "success" | "warning" | "danger"

const tones: Record<Tone, string> = {
  neutral: "bg-[var(--color-surface-2)] text-[var(--color-muted)] border-[var(--color-border)]",
  accent: "bg-[var(--color-accent-soft)] text-[var(--color-accent-hover)] border-[var(--color-accent)]/40",
  success: "bg-[var(--color-success)]/10 text-[var(--color-success)] border-[var(--color-success)]/30",
  warning: "bg-[var(--color-warning)]/10 text-[var(--color-warning)] border-[var(--color-warning)]/30",
  danger: "bg-[var(--color-danger)]/10 text-[var(--color-danger)] border-[var(--color-danger)]/30",
}

export function Badge({ tone = "neutral", children }: { tone?: Tone; children: React.ReactNode }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${tones[tone]}`}
    >
      {children}
    </span>
  )
}
