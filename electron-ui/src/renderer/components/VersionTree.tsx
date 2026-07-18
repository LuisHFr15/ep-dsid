import type { VersionNode } from '../types'

interface VersionTreeProps {
  versions: VersionNode[]
  onPromote?: (versionId: string) => void
  canContribute: boolean
}

export function VersionTree({ versions, onPromote, canContribute }: VersionTreeProps) {
  if (versions.length === 0) {
    return <div className="empty"><p>Nenhuma versão disponível.</p></div>
  }

  // Sort by lamportTs descending (newest first)
  const sorted = [...versions].sort((a, b) => b.lamportTs - a.lamportTs)

  return (
    <div className="version-tree">
      {sorted.map((v, i) => (
        <div
          key={v.versionId}
          className={`version-node${v.isCurrent ? ' is-current' : ''}${v.concurrent ? ' is-conflict' : ''}`}
        >
          {i < sorted.length - 1 && <div className="version-node-line" />}
          <div className="version-node-dot" />
          <div className="version-node-body">
            <div className="version-node-badges">
              {v.isCurrent && <span className="badge badge-current">Atual</span>}
              {v.concurrent && <span className="badge badge-conflict">Conflito</span>}
            </div>
            <div className="version-node-filename">{v.filename}</div>
            <div className="version-node-meta">
              <span>Lamport #{v.lamportTs}</span>
              <span>{formatBytes(v.size)}</span>
              <span>autor: {v.authorId.slice(0, 8)}</span>
              <span>{new Date(v.createdAt).toLocaleString('pt-BR')}</span>
              {v.parentVersionId && (
                <span style={{ fontFamily: 'monospace', fontSize: 11 }}>
                  parent: {v.parentVersionId.slice(0, 8)}
                </span>
              )}
            </div>
            {canContribute && v.concurrent && onPromote && (
              <div className="version-node-actions" style={{ marginTop: 8 }}>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => onPromote(v.versionId)}
                >
                  Promover como atual
                </button>
              </div>
            )}
          </div>
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
