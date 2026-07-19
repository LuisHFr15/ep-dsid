import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useInterval } from '../hooks/useInterval'
import { VersionTree } from '../components/VersionTree'
import { api } from '../ipc-client'
import type { Network, FileVersion, FileVersionsResult, NetworkAccessRequest, ActivePeer } from '../types'
import { Button, Card, Badge, Tabs, Spinner, EmptyState, useToast, type TabItem } from '../components/ui'

type Tab = 'arquivo' | 'versoes' | 'peers' | 'acesso'

export function NetworkDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { session } = useAuth()
  const navigate = useNavigate()
  const { toast } = useToast()

  const [network, setNetwork] = useState<Network | null>(null)
  const [currentFile, setCurrentFile] = useState<FileVersion | null>(null)
  const [versionsResult, setVersionsResult] = useState<FileVersionsResult | null>(null)
  const [accessRequests, setAccessRequests] = useState<NetworkAccessRequest[]>([])
  const [peers, setPeers] = useState<ActivePeer[]>([])
  const [tab, setTab] = useState<Tab>('arquivo')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const isOwner = session && network ? session.userId === network.ownerId : false
  const canContribute = isOwner || network?.updateMode === 'collaborative'

  const load = useCallback(async () => {
    if (!session || !id) return
    setLoading(true)
    setError('')
    try {
      const nets = await api.listNetworks()
      const found = nets.find(n => n.id === id)
      if (!found) { navigate('/networks'); return }
      setNetwork(found)
      if (found.activeFileId) {
        const [file, versions] = await Promise.all([
          api.getCurrentFile(id) as Promise<FileVersion>,
          api.listVersions(id),
        ])
        setCurrentFile(file)
        setVersionsResult(versions)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao carregar')
    } finally {
      setLoading(false)
    }
  }, [session, id, navigate])

  useEffect(() => { load() }, [load])

  useInterval(() => {
    if (!id) return
    api.listPeers(id).then(r => setPeers(r.activePeers)).catch(() => {})
  }, 10000)

  useEffect(() => {
    if (tab === 'acesso' && isOwner && id) {
      api.listAccessRequests(id).then(setAccessRequests).catch(() => {})
    }
  }, [tab, isOwner, id])

  async function handleAnnounce() {
    if (!id) return
    const filePath = await api.openFilePicker()
    if (!filePath) return
    setBusy(true)
    try {
      await api.publishLocal(id, filePath)
      toast('Arquivo publicado.', 'success')
      await load()
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Erro ao publicar', 'error')
    } finally {
      setBusy(false)
    }
  }

  async function handleDownload() {
    if (!id) return
    setBusy(true)
    try {
      await api.downloadCurrent(id)
      toast('Download concluído no seu workspace.', 'success')
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Erro ao baixar', 'error')
    } finally {
      setBusy(false)
    }
  }

  async function handleRequestAccess() {
    if (!id) return
    try {
      await api.requestAccess(id)
      toast('Pedido de acesso enviado.', 'success')
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Erro', 'error')
    }
  }

  async function handleDecide(userId: string, decision: 'approve' | 'reject') {
    if (!id) return
    try {
      await api.decideAccess(id, userId, decision)
      setAccessRequests(prev => prev.filter(r => r.userId !== userId))
      toast(decision === 'approve' ? 'Acesso aprovado.' : 'Pedido rejeitado.', 'success')
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Erro', 'error')
    }
  }

  async function handlePromote(versionId: string) {
    if (!id) return
    try {
      await api.promoteVersion(id, versionId)
      toast('Versão promovida.', 'success')
      await load()
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Erro ao promover', 'error')
    }
  }

  if (loading) {
    return <div className="flex justify-center py-20"><Spinner size={24} /></div>
  }
  if (error) {
    return (
      <EmptyState
        title="Não foi possível carregar"
        description={error}
        action={<Button variant="subtle" onClick={() => navigate('/networks')}>Voltar</Button>}
      />
    )
  }
  if (!network) return null

  const tabs: TabItem[] = [
    { id: 'arquivo', label: 'Arquivo' },
    { id: 'versoes', label: 'Versões' },
    { id: 'peers', label: 'Peers' },
    { id: 'acesso', label: 'Acesso', badge: isOwner ? accessRequests.length : 0 },
  ]

  return (
    <div>
      <div className="pt-2 mb-4">
        <button
          className="app-no-drag mb-2 text-sm text-[var(--color-muted)] hover:text-[var(--color-content)]"
          onClick={() => navigate('/networks')}
        >
          ← Redes
        </button>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{network.title}</h1>
            <div className="mt-2 flex items-center gap-2">
              <Badge tone={network.accessMode === 'public' ? 'success' : 'neutral'}>
                {network.accessMode === 'public' ? 'Pública' : 'Privada'}
              </Badge>
              {network.updateMode === 'collaborative' && <Badge tone="accent">Colaborativo</Badge>}
              <span className="text-sm text-[var(--color-muted)]">
                {peers.length} peer{peers.length !== 1 ? 's' : ''} online
              </span>
            </div>
            {network.description && (
              <p className="mt-2 text-sm text-[var(--color-muted)]">{network.description}</p>
            )}
          </div>
          {!isOwner && network.accessMode === 'private' && (
            <Button onClick={handleRequestAccess}>Pedir acesso</Button>
          )}
        </div>
      </div>

      <div className="mb-5">
        <Tabs items={tabs} active={tab} onChange={(t) => setTab(t as Tab)} />
      </div>

      {tab === 'arquivo' && (
        currentFile ? (
          <Card>
            <div className="mb-2 text-base font-semibold">{currentFile.filename}</div>
            <div className="flex flex-col gap-1 text-sm text-[var(--color-muted)]">
              <span>Tamanho: {formatBytes(currentFile.size)}</span>
              <span>Lamport: #{currentFile.lamportTs}</span>
              <span className="break-all font-mono text-[11px]">infoHash: {currentFile.infoHash}</span>
              <span className="break-all font-mono text-[11px]">magnet: {currentFile.magnet}</span>
            </div>
            <div className="mt-4 flex gap-2">
              <Button onClick={handleDownload} loading={busy}>Baixar (P2P)</Button>
              <Button variant="ghost" onClick={load}>Atualizar</Button>
            </div>
          </Card>
        ) : (
          <EmptyState
            icon="📄"
            title="Nenhum arquivo publicado"
            description={isOwner ? 'Publique o primeiro arquivo desta rede.' : 'O admin ainda não publicou um arquivo.'}
            action={isOwner && <Button onClick={handleAnnounce} loading={busy}>Selecionar arquivo</Button>}
          />
        )
      )}

      {tab === 'versoes' && (
        <VersionTree
          versions={versionsResult?.versions ?? []}
          onPromote={handlePromote}
          canContribute={!!canContribute}
        />
      )}

      {tab === 'peers' && (
        <div className="flex flex-col gap-2">
          {peers.length === 0 ? (
            <EmptyState title="Nenhum peer online" description="Ninguém está semeando esta rede no momento." />
          ) : (
            peers.map((p, i) => (
              <div key={`${p.username}-${i}`} className="flex items-center gap-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2">
                <span className="h-2 w-2 rounded-full bg-[var(--color-success)]" />
                <span className="text-sm text-[var(--color-content)]">{p.username}</span>
                <span className="ml-auto text-xs text-[var(--color-faint)]">{timeAgo(p.lastSeenAt)}</span>
              </div>
            ))
          )}
        </div>
      )}

      {tab === 'acesso' && (
        !isOwner ? (
          <EmptyState title="Sem permissão" description="Somente o admin da rede gerencia acessos." />
        ) : accessRequests.length === 0 ? (
          <EmptyState title="Nenhum pedido pendente" description="Novos pedidos de acesso aparecem aqui." />
        ) : (
          <div className="flex flex-col gap-2">
            {accessRequests.map(r => (
              <div key={r.userId} className="flex items-center gap-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3">
                <span className="font-medium">{r.username ?? r.userId}</span>
                <span className="text-xs text-[var(--color-faint)]">{new Date(r.createdAt).toLocaleString('pt-BR')}</span>
                <div className="ml-auto flex gap-2">
                  <Button size="sm" onClick={() => handleDecide(r.userId, 'approve')}>Aprovar</Button>
                  <Button size="sm" variant="danger" onClick={() => handleDecide(r.userId, 'reject')}>Rejeitar</Button>
                </div>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  )
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(1)} MB`
  return `${(bytes / 1024 ** 3).toFixed(2)} GB`
}

function timeAgo(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000
  if (diff < 60) return `${Math.round(diff)}s atrás`
  if (diff < 3600) return `${Math.round(diff / 60)}min atrás`
  return `${Math.round(diff / 3600)}h atrás`
}
