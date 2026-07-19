import { useState, useEffect } from 'react'
import { useInterval } from '../hooks/useInterval'
import { api, TransferView } from '../ipc-client'
import { Badge, EmptyState, Spinner } from '../components/ui'

export function TransfersPage() {
  const [transfers, setTransfers] = useState<TransferView[]>([])
  const [loading, setLoading] = useState(true)

  function load() {
    api
      .listTransfers()
      .then(setTransfers)
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])
  useInterval(load, 3000)

  return (
    <div>
      <div className="mb-6 pt-2">
        <h1 className="text-2xl font-bold tracking-tight">Transferências</h1>
        <p className="mt-1 text-sm text-[var(--color-muted)]">
          Uploads (seed) e downloads locais deste dispositivo.
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Spinner size={24} /></div>
      ) : transfers.length === 0 ? (
        <EmptyState icon="↕" title="Nenhuma transferência" description="Publicações e downloads aparecem aqui." />
      ) : (
        <div className="overflow-hidden rounded-xl border border-[var(--color-border)]">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)] bg-[var(--color-surface)] text-left text-xs text-[var(--color-muted)]">
                <th className="px-4 py-2 font-medium">Arquivo</th>
                <th className="px-4 py-2 font-medium">Rede</th>
                <th className="px-4 py-2 font-medium">Direção</th>
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2 font-medium">Tamanho</th>
              </tr>
            </thead>
            <tbody>
              {transfers.map((t) => (
                <tr key={t.id} className="border-b border-[var(--color-border)] last:border-0 hover:bg-[var(--color-surface)]">
                  <td className="px-4 py-2">
                    <div className="font-medium">{t.filename}</div>
                    <div className="truncate font-mono text-[11px] text-[var(--color-faint)]" title={t.destinationPath}>
                      {t.destinationPath}
                    </div>
                  </td>
                  <td className="px-4 py-2 text-[var(--color-muted)]">{t.networkTitle}</td>
                  <td className="px-4 py-2">
                    <Badge tone={t.direction === 'upload' ? 'accent' : 'neutral'}>
                      {t.direction === 'upload' ? 'Upload' : 'Download'}
                    </Badge>
                  </td>
                  <td className="px-4 py-2">
                    <Badge tone={statusTone(t.status)}>{statusLabel(t.status)}</Badge>
                  </td>
                  <td className="px-4 py-2 text-[var(--color-muted)]">{formatBytes(t.size)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function statusTone(status: string): 'success' | 'warning' | 'danger' | 'neutral' {
  if (status === 'completed') return 'success'
  if (status === 'failed') return 'danger'
  if (status === 'starting') return 'warning'
  return 'neutral'
}

function statusLabel(status: string): string {
  return { completed: 'Concluído', failed: 'Falhou', starting: 'Em andamento' }[status] ?? status
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(1)} MB`
  return `${(bytes / 1024 ** 3).toFixed(2)} GB`
}
