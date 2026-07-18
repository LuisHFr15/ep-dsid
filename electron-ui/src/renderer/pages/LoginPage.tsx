import { useState, FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

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
    <div className="auth-page">
      <div className="auth-card">
        <h1>EP-DSID</h1>
        <p className="subtitle">
          {mode === 'login' ? 'Acesse sua conta' : 'Crie uma conta nova'}
        </p>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Usuário</label>
            <input
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="nome de usuário"
              autoFocus
              required
            />
          </div>
          <div className="form-group">
            <label>Senha</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="senha"
              required
            />
          </div>
          {error && <p className="error-msg">{error}</p>}
          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', marginTop: 8 }}
            disabled={loading}
          >
            {loading ? <span className="spinner" /> : mode === 'login' ? 'Entrar' : 'Registrar'}
          </button>
        </form>
        <p className="auth-switch">
          {mode === 'login' ? (
            <>
              Não tem conta?{' '}
              <a href="#" onClick={e => { e.preventDefault(); setMode('register'); setError('') }}>
                Registrar
              </a>
            </>
          ) : (
            <>
              Já tem conta?{' '}
              <a href="#" onClick={e => { e.preventDefault(); setMode('login'); setError('') }}>
                Entrar
              </a>
            </>
          )}
        </p>
      </div>
    </div>
  )
}
