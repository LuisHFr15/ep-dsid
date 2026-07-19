import type { VersionNode } from '../types'
import { Badge, Button, EmptyState } from './ui'

interface VersionTreeProps {
  versions: VersionNode[]
  onPromote?: (versionId: string) => void
  canContribute: boolean
}

export function VersionTree({ versions, onPromote, canContribute }: VersionTreeProps) {
  if (versions.length === 0) {
    return <EmptyState title="Nenhuma versão" description="As versões publicadas aparecem aqui." />
  }

  const sorted = [...versions].sort((a, b) => b.lamportTs - a.lamportTs)

  return (
    <div className="flex flex-col gap-2">
      {sorted.map((v) => (
        <div
          key={v.versionId}
          className={`rounded-lg border bg-[var(--color-surface)] p-4 ${
            v.isCurrent
              ? 'border-[var(--color-accent)]/50'
              : v.concurrent
                ? 'border-[var(--color-warning)]/40'
                : 'border-[var(--color-border)]'
          }`}
        >
          <div className="mb-2 flex items-center gap-2">
            {v.isCurrent && <Badge tone="accent">Atual</Badge>}
            {v.concurrent && <Badge tone="warning">Conflito</Badge>}
            <span className="font-medium">{v.filename}</span>
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-[var(--color-muted)]">
            <span>Lamport #{v.lamportTs}</span>
            <span>{formatBytes(v.size)}</span>
            <span>autor: {v.authorId.slice(0, 8)}</span>
            <span>{new Date(v.createdAt).toLocaleString('pt-BR')}</span>
            {v.parentVersionId && (
              <span className="font-mono">parent: {v.parentVersionId.slice(0, 8)}</span>
            )}
          </div>
          {canContribute && v.concurrent && onPromote && (
            <div className="mt-3">
              <Button size="sm" variant="subtle" onClick={() => onPromote(v.versionId)}>
                Promover como atual
              </Button>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(1)} MB`
  return `${(bytes / 1024 ** 3).toFixed(2)} GB`
}
