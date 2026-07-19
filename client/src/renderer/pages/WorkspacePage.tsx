import { useState, useEffect, useCallback } from 'react'
import { api, WorkspaceStatus } from '../ipc-client'
import { Button, Card, Spinner, useToast } from '../components/ui'

export function WorkspacePage() {
  const { toast } = useToast()
  const [status, setStatus] = useState<WorkspaceStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [choosing, setChoosing] = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    api
      .workspaceStatus()
      .then(setStatus)
      .catch(() => setStatus(null))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  async function handleChoose() {
    setChoosing(true)
    try {
      await api.chooseWorkspace()
      toast('Pasta de compartilhamento definida.', 'success')
      load()
    } catch (err) {
      // cancelar o dialog cai aqui — não é erro real
      if (err instanceof Error && !/cancel/i.test(err.message)) {
        toast(err.message, 'error')
      }
    } finally {
      setChoosing(false)
    }
  }

  if (loading) {
    return <div className="flex justify-center py-20"><Spinner size={24} /></div>
  }

  return (
    <div>
      <div className="mb-6 pt-2">
        <h1 className="text-2xl font-bold tracking-tight">Workspace</h1>
        <p className="mt-1 text-sm text-[var(--color-muted)]">
          A pasta local onde seus arquivos compartilhados são semeados e baixados.
        </p>
      </div>

      <Card>
        {status?.configured ? (
          <div className="flex flex-col gap-3">
            <div>
              <p className="text-xs font-medium text-[var(--color-muted)]">Pasta atual</p>
              <p className="mt-1 break-all font-mono text-sm">{status.rootDirectory}</p>
            </div>
            {!status.directoryExists && (
              <p className="rounded-lg border border-[var(--color-warning)]/30 bg-[var(--color-warning)]/10 px-3 py-2 text-sm text-[var(--color-warning)]">
                ⚠ A pasta configurada não existe mais no disco. Escolha outra.
              </p>
            )}
            <div>
              <Button variant="subtle" onClick={handleChoose} loading={choosing}>
                Trocar pasta
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-start gap-3">
            <p className="text-sm text-[var(--color-muted)]">
              Nenhuma pasta configurada ainda. Escolha uma para poder publicar e baixar arquivos.
            </p>
            <Button onClick={handleChoose} loading={choosing}>
              Escolher pasta
            </Button>
          </div>
        )}
      </Card>
    </div>
  )
}
