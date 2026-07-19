import { useState, useEffect, FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { api } from '../ipc-client'
import type { Network } from '../types'
import { Button, Card, Input, Badge, Modal, EmptyState, useToast } from '../components/ui'

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
      const data = await api.listNetworks()
      const filtered = q
        ? data.filter((n) => {
            const needle = q.toLowerCase()
            return (
              n.title.toLowerCase().includes(needle) ||
              (n.description ?? '').toLowerCase().includes(needle) ||
              n.tags.some((t) => t.toLowerCase().includes(needle))
            )
          })
        : data
      setNetworks(filtered)
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
    <div>
      <div className="mb-6 flex items-center justify-between pt-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Redes P2P</h1>
          <p className="mt-1 text-sm text-[var(--color-muted)]">
            Descubra, crie e participe de redes de compartilhamento.
          </p>
        </div>
        <Button onClick={() => setShowCreate(true)}>+ Nova rede</Button>
      </div>

      <form className="mb-6 flex gap-2" onSubmit={handleSearch}>
        <Input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Buscar por título, descrição ou tag…"
          className="flex-1"
        />
        <Button variant="subtle" type="submit">Buscar</Button>
        {query && (
          <Button variant="ghost" type="button" onClick={() => { setQuery(''); load() }}>
            Limpar
          </Button>
        )}
      </form>

      {loading ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-28 animate-pulse rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]" />
          ))}
        </div>
      ) : networks.length === 0 ? (
        <EmptyState
          icon="🗂"
          title={query ? 'Nenhuma rede encontrada' : 'Nenhuma rede ainda'}
          description={query ? 'Tente outra busca.' : 'Crie a primeira rede para começar a compartilhar.'}
          action={!query && <Button onClick={() => setShowCreate(true)}>+ Nova rede</Button>}
        />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {networks.map(n => (
            <Card key={n.id} interactive onClick={() => navigate(`/networks/${n.id}`)}>
              <div className="mb-2 flex items-start justify-between gap-2">
                <span className="font-semibold">{n.title}</span>
                <div className="flex flex-shrink-0 gap-1">
                  <Badge tone={n.accessMode === 'public' ? 'success' : 'neutral'}>
                    {n.accessMode === 'public' ? 'Pública' : 'Privada'}
                  </Badge>
                  {n.updateMode === 'collaborative' && <Badge tone="accent">Colab</Badge>}
                </div>
              </div>
              {n.description && (
                <p className="mb-3 line-clamp-2 text-sm text-[var(--color-muted)]">{n.description}</p>
              )}
              {n.tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {n.tags.map(t => (
                    <span key={t} className="rounded-md bg-[var(--color-surface-2)] px-1.5 py-0.5 text-[11px] text-[var(--color-muted)]">
                      {t}
                    </span>
                  ))}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {showCreate && (
        <CreateNetworkModal
          onClose={() => setShowCreate(false)}
          onCreated={() => { setShowCreate(false); load() }}
        />
      )}
    </div>
  )
}

function CreateNetworkModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const { toast } = useToast()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [tags, setTags] = useState('')
  const [accessMode, setAccessMode] = useState<'public' | 'private'>('public')
  const [updateMode, setUpdateMode] = useState<'centralized' | 'collaborative'>('centralized')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      await api.createNetwork({
        title,
        description: description || undefined,
        tags: tags ? tags.split(',').map(t => t.trim()).filter(Boolean) : [],
        accessMode,
        updateMode
      })
      toast('Rede criada.', 'success')
      onCreated()
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Erro ao criar rede', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal title="Nova rede P2P" onClose={onClose}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input label="Título" value={title} onChange={e => setTitle(e.target.value)} required autoFocus />
        <Input label="Descrição" value={description} onChange={e => setDescription(e.target.value)} />
        <Input label="Tags (separadas por vírgula)" value={tags} onChange={e => setTags(e.target.value)} placeholder="dados, projeto, turma" />

        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-[var(--color-muted)]">Modo de acesso</span>
          <div className="flex gap-2">
            <SegButton active={accessMode === 'public'} onClick={() => setAccessMode('public')}>Pública</SegButton>
            <SegButton active={accessMode === 'private'} onClick={() => setAccessMode('private')}>Privada</SegButton>
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-[var(--color-muted)]">Modo de atualização</span>
          <div className="flex gap-2">
            <SegButton active={updateMode === 'centralized'} onClick={() => setUpdateMode('centralized')}>Centralizado</SegButton>
            <SegButton active={updateMode === 'collaborative'} onClick={() => setUpdateMode('collaborative')}>Colaborativo</SegButton>
          </div>
        </div>

        <div className="mt-2 flex justify-end gap-2">
          <Button variant="ghost" type="button" onClick={onClose}>Cancelar</Button>
          <Button type="submit" loading={loading}>Criar rede</Button>
        </div>
      </form>
    </Modal>
  )
}

function SegButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`app-no-drag flex-1 rounded-lg border px-3 py-2 text-sm transition-colors ${
        active
          ? 'border-[var(--color-accent)] bg-[var(--color-accent-soft)] text-[var(--color-content)]'
          : 'border-[var(--color-border)] text-[var(--color-muted)] hover:border-[var(--color-border-strong)]'
      }`}
    >
      {children}
    </button>
  )
}
