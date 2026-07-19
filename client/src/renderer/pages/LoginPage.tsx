import { useState, FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Button, Input } from '../components/ui'

export function LoginPage() {
  const { login, register } = useAuth()
  const navigate = useNavigate()
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      if (mode === 'login') {
        await login(username, password)
      } else {
        await register(username, password)
      }
      navigate('/networks')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="app-drag flex h-screen items-center justify-center bg-[var(--color-bg)]">
      <div className="app-no-drag w-full max-w-sm rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-8 shadow-[var(--shadow-panel)]">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--color-accent-soft)] text-xl font-bold text-[var(--color-accent-hover)]">
            ⇄
          </div>
          <h1 className="text-xl font-bold tracking-tight">EP-DSID</h1>
          <p className="mt-1 text-sm text-[var(--color-muted)]">
            {mode === 'login' ? 'Acesse sua conta' : 'Crie uma conta nova'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input
            label="Usuário"
            value={username}
            onChange={e => setUsername(e.target.value)}
            placeholder="nome de usuário"
            autoFocus
            required
          />
          <Input
            label="Senha"
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="senha"
            required
          />
          {error && (
            <p className="rounded-lg border border-[var(--color-danger)]/30 bg-[var(--color-danger)]/10 px-3 py-2 text-sm text-[var(--color-danger)]">
              {error}
            </p>
          )}
          <Button type="submit" loading={loading} className="w-full">
            {mode === 'login' ? 'Entrar' : 'Registrar'}
          </Button>
        </form>

        <p className="mt-5 text-center text-sm text-[var(--color-muted)]">
          {mode === 'login' ? 'Não tem conta? ' : 'Já tem conta? '}
          <button
            className="app-no-drag font-medium text-[var(--color-accent-hover)] hover:underline"
            onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError('') }}
          >
            {mode === 'login' ? 'Registrar' : 'Entrar'}
          </button>
        </p>
      </div>
    </div>
  )
}
