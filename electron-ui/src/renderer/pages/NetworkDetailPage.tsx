import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useHeartbeat } from '../hooks/useHeartbeat'
import { VersionTree } from '../components/VersionTree'
import * as api from '../api'
import type { Network, FileVersion, FileVersionsResult, NetworkAccessRequest } from '../types'

type Tab = 'arquivo' | 'versoes' | 'peers' | 'acesso'

export function NetworkDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { session } = useAuth()
  const navigate = useNavigate()

  const [network, setNetwork] = useState<Network | null>(null)
  const [currentFile, setCurrentFile] = useState<FileVersion | null>(null)
  const [versionsResult, setVersionsResult] = useState<FileVersionsResult | null>(null)
  const [accessRequests, setAccessRequests] = useState<NetworkAccessRequest[]>([])
  const [tab, setTab] = useState<Tab>('arquivo')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [announcing, setAnnouncing] = useState(false)

  const { peers, fallbackActive, peerId } = useHeartbeat(id ?? null)

  const isOwner = session && network ? session.userId === network.ownerId : false
  const canContribute =
    isOwner || network?.updateMode === 'collaborative'

  const load = useCallback(async () => {
    if (!session || !id) return
    setLoading(true)
    setError('')
    try {
      // Load network info from listing (hub doesn't have GET /networks/:id directly)
      const nets = await api.listNetworks(session.jwt)
      const found = nets.find(n => n.id === id)
      if (!found) { navigate('/networks'); return }
      setNetwork(found)

      if (found.activeFileId) {
        const [file, versions] = await Promise.all([
          api.getCurrentFile(session.jwt, id),
          api.listVersions(session.jwt, id)
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

  useEffect(() => {
    if (tab === 'acesso' && isOwner && session && id) {
      api.listAccessRequests(session.jwt, id).then(setAccessRequests).catch(() => {})
    }
  }, [tab, isOwner, session, id])

  async function handleAnnounce(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !session || !id) return
    setAnnouncing(true)
    try {
      const infoHash = crypto.randomUUID()
      await api.announceFile(session.jwt, id, {
        filename: file.name,
        size: file.size,
        infoHash,
        magnet: `magnet:?xt=urn:btih:${infoHash}&dn=${encodeURIComponent(file.name)}`
      })
      await load()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erro ao anunciar arquivo')
    } finally {
      setAnnouncing(false)
      e.target.value = ''
    }
  }

  async function handleRequestAccess() {
    if (!session || !id) return
    try {
      await api.requestAccess(session.jwt, id)
      alert('Pedido enviado!')
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Erro')
    }
  }

  async function handleDecide(userId: string, decision: 'approve' | 'reject') {
    if (!session || !id) return
    try {
      await api.decideAccess(session.jwt, id, userId, decision)
      setAccessRequests(prev => prev.filter(r => r.userId !== userId))
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Erro')
    }
  }

  async function handlePromote(versionId: string) {
    if (!session || !id) return
    try {
      await api.promoteVersion(session.jwt, id, versionId)
      await load()
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Erro ao promover versão')
    }
  }

  if (loading) {
    return <div className="empty"><span className="spinner" /></div>
  }
  if (error) {
    return (
      <div className="empty">
        <p className="error-msg">{error}</p>
        <button className="btn btn-ghost" style={{ marginTop: 12 }} onClick={() => navigate('/networks')}>
          Voltar
        </button>
      </div>
    )
  }
  if (!network) return null

  return (
    <div className="network-detail">
      {/* Header */}
      <div className="page-header">
        <div>
          <button
            className="btn btn-ghost btn-sm"
            style={{ marginBottom: 8 }}
            onClick={() => navigate('/networks')}
          >
            ← Redes
          </button>
          <h1 className="page-title">{network.title}</h1>
          <div className="network-meta">
            <span className={`badge badge-${network.accessMode}`}>
              {network.accessMode === 'public' ? 'Pública' : 'Privada'}
            </span>
            {network.updateMode === 'collaborative' && (
              <span className="badge badge-collab">Colaborativo</span>
            )}
            <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>
              {peers.length} peer{peers.length !== 1 ? 's' : ''} online
            </span>
            {fallbackActive && (
              <span style={{ color: 'var(--warning)', fontSize: 13 }}>
                ⚠ fallback ativo
              </span>
            )}
          </div>
          {network.description && (
            <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 4 }}>
              {network.description}
            </p>
          )}
        </div>
        {!isOwner && network.accessMode === 'private' && (
          <button className="btn btn-primary" onClick={handleRequestAccess}>
            Pedir acesso
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="tabs">
        {(['arquivo', 'versoes', 'peers', 'acesso'] as Tab[]).map(t => (
          <button
            key={t}
            className={`tab-btn${tab === t ? ' active' : ''}`}
            onClick={() => setTab(t)}
          >
            {{
              arquivo: 'Arquivo',
              versoes: 'Versões',
              peers: 'Peers',
              acesso: 'Acesso'
            }[t]}
            {t === 'acesso' && isOwner && accessRequests.length > 0 && (
              <span
                style={{
                  marginLeft: 6,
                  background: 'var(--warning)',
                  color: '#000',
                  borderRadius: 20,
                  padding: '0 6px',
                  fontSize: 11
                }}
              >
                {accessRequests.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'arquivo' && (
        <div>
          {currentFile ? (
            <div className="card">
              <div style={{ marginBottom: 8, fontWeight: 600, fontSize: 16 }}>
                {currentFile.filename}
              </div>
              <div style={{ color: 'var(--text-muted)', fontSize: 13, display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span>Tamanho: {formatBytes(currentFile.size)}</span>
                <span>Lamport: #{currentFile.lamportTs}</span>
                <span style={{ fontFamily: 'monospace', fontSize: 11 }}>
                  infoHash: {currentFile.infoHash}
                </span>
                <span style={{ fontFamily: 'monospace', fontSize: 11, wordBreak: 'break-all' }}>
                  magnet: {currentFile.magnet}
                </span>
              </div>
              <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
                <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                  Download P2P disponível no MVP 9 (WebTorrent)
                </span>
                <button className="btn btn-ghost" onClick={load}>
                  Atualizar
                </button>
              </div>
            </div>
          ) : (
            <div className="empty">
              <p>Nenhum arquivo anunciado nesta rede ainda.</p>
              {isOwner && (
                <>
                  <input
                    type="file"
                    id="file-announce"
                    style={{ display: 'none' }}
                    onChange={handleAnnounce}
                  />
                  <label
                    htmlFor="file-announce"
                    className="btn btn-primary"
                    style={{ display: 'inline-block', marginTop: 16, cursor: 'pointer' }}
                  >
                    {announcing ? <span className="spinner" /> : 'Selecionar arquivo'}
                  </label>
                </>
              )}
            </div>
          )}
        </div>
      )}

      {tab === 'versoes' && (
        <VersionTree
          versions={versionsResult?.versions ?? []}
          onPromote={handlePromote}
          canContribute={!!canContribute}
        />
      )}

      {tab === 'peers' && (
        <div>
          {fallbackActive && (
            <div className="fallback-notice">
              ⚠ Fallback do servidor ativo — poucos peers humanos online (≤4).
            </div>
          )}
          <div className="peers-list">
            <div className="peer-item">
              <div className="peer-dot" />
              <span style={{ fontWeight: 600 }}>Você</span>
              <span style={{ color: 'var(--text-muted)', fontFamily: 'monospace', fontSize: 11 }}>
                {peerId.slice(0, 8)}…
              </span>
            </div>
            {peers
              .filter(p => p.peerId !== peerId)
              .map(p => (
                <div key={p.peerId} className="peer-item">
                  <div className="peer-dot" />
                  <span>{p.userId.slice(0, 8)}…</span>
                  <span style={{ color: 'var(--text-muted)', fontFamily: 'monospace', fontSize: 11 }}>
                    {p.peerId.slice(0, 8)}…
                  </span>
                  <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>
                    {timeAgo(p.lastSeenAt)}
                  </span>
                </div>
              ))}
            {peers.length <= 1 && (
              <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 8 }}>
                Nenhum outro peer online no momento.
              </p>
            )}
          </div>
        </div>
      )}

      {tab === 'acesso' && (
        <div>
          {!isOwner ? (
            <div className="empty"><p>Somente o admin da rede pode gerenciar acessos.</p></div>
          ) : accessRequests.length === 0 ? (
            <div className="empty"><p>Nenhum pedido de acesso pendente.</p></div>
          ) : (
            <div className="access-list">
              {accessRequests.map(r => (
                <div key={r.userId} className="access-item">
                  <span className="access-item-user">{r.username ?? r.userId}</span>
                  <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                    {new Date(r.createdAt).toLocaleString('pt-BR')}
                  </span>
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() => handleDecide(r.userId, 'approve')}
                  >
                    Aprovar
                  </button>
                  <button
                    className="btn btn-danger btn-sm"
                    onClick={() => handleDecide(r.userId, 'reject')}
                  >
                    Rejeitar
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
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
