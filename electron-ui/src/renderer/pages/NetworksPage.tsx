import { useState, useEffect, FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import * as api from '../api'
import type { Network } from '../types'

export function NetworksPage() {
  const { session } = useAuth()
  const navigate = useNavigate()
  const [networks, setNetworks] = useState<Network[]>([])
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)

  async function load(q?: string) {
    if (!session) return
    setLoading(true)
    try {
      const data = await api.listNetworks(session.jwt, q ? { q } : undefined)
      setNetworks(data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [session])

  function handleSearch(e: FormEvent) {
    e.preventDefault()
    load(query)
  }

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Redes P2P</h1>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
          + Nova rede
        </button>
      </div>

      <form className="search-bar" onSubmit={handleSearch}>
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Buscar por título ou tag…"
        />
        <button type="submit" className="btn btn-ghost">Buscar</button>
        {query && (
          <button type="button" className="btn btn-ghost" onClick={() => { setQuery(''); load() }}>
            Limpar
          </button>
        )}
      </form>

      {loading ? (
        <div className="empty"><span className="spinner" /></div>
      ) : networks.length === 0 ? (
        <div className="empty">
          <p>Nenhuma rede encontrada.</p>
        </div>
      ) : (
        <div className="networks-grid">
          {networks.map(n => (
            <div
              key={n.id}
              className="network-card"
              onClick={() => navigate(`/networks/${n.id}`)}
            >
              <div className="network-card-header">
                <span className="network-card-title">{n.title}</span>
                <div style={{ display: 'flex', gap: 4 }}>
                  <span className={`badge badge-${n.accessMode}`}>
                    {n.accessMode === 'public' ? 'Pública' : 'Privada'}
                  </span>
                  {n.updateMode === 'collaborative' && (
                    <span className="badge badge-collab">Colab</span>
                  )}
                </div>
              </div>
              {n.description && (
                <p className="network-card-desc">{n.description}</p>
              )}
              {n.tags.length > 0 && (
                <div className="network-card-tags">
                  {n.tags.map(t => <span key={t} className="tag">{t}</span>)}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {showCreate && (
        <CreateNetworkModal
          jwt={session!.jwt}
          onClose={() => setShowCreate(false)}
          onCreated={() => { setShowCreate(false); load() }}
        />
      )}
    </>
  )
}

function CreateNetworkModal({
  jwt,
  onClose,
  onCreated
}: {
  jwt: string
  onClose: () => void
  onCreated: () => void
}) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [tags, setTags] = useState('')
  const [accessMode, setAccessMode] = useState<'public' | 'private'>('public')
  const [updateMode, setUpdateMode] = useState<'centralized' | 'collaborative'>('centralized')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await api.createNetwork(jwt, {
        title,
        description: description || undefined,
        tags: tags ? tags.split(',').map(t => t.trim()).filter(Boolean) : [],
        accessMode,
        updateMode
      })
      onCreated()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao criar rede')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal">
        <h2>Nova rede P2P</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Título *</label>
            <input value={title} onChange={e => setTitle(e.target.value)} required autoFocus />
          </div>
          <div className="form-group">
            <label>Descrição</label>
            <input value={description} onChange={e => setDescription(e.target.value)} />
          </div>
          <div className="form-group">
            <label>Tags (separadas por vírgula)</label>
            <input value={tags} onChange={e => setTags(e.target.value)} placeholder="dados, projeto, turma" />
          </div>
          <div className="form-group">
            <label>Modo de acesso</label>
            <div className="radio-group">
              <label className="radio-option">
                <input type="radio" checked={accessMode === 'public'} onChange={() => setAccessMode('public')} />
                Pública
              </label>
              <label className="radio-option">
                <input type="radio" checked={accessMode === 'private'} onChange={() => setAccessMode('private')} />
                Privada
              </label>
            </div>
          </div>
          <div className="form-group">
            <label>Modo de atualização</label>
            <div className="radio-group">
              <label className="radio-option">
                <input type="radio" checked={updateMode === 'centralized'} onChange={() => setUpdateMode('centralized')} />
                Centralizado (só admin publica)
              </label>
              <label className="radio-option">
                <input type="radio" checked={updateMode === 'collaborative'} onChange={() => setUpdateMode('collaborative')} />
                Colaborativo
              </label>
            </div>
          </div>
          {error && <p className="error-msg">{error}</p>}
          <div className="modal-actions">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? <span className="spinner" /> : 'Criar rede'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
