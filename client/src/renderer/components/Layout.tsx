import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Button } from './ui'

const navItemClass = ({ isActive }: { isActive: boolean }) =>
  `app-no-drag flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
    isActive
      ? 'bg-[var(--color-accent-soft)] text-[var(--color-content)]'
      : 'text-[var(--color-muted)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-content)]'
  }`

export function Layout({ children }: { children: React.ReactNode }) {
  const { session, logout } = useAuth()
  const navigate = useNavigate()

  async function handleLogout() {
    await logout()
    navigate('/login')
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--color-bg)]">
      <aside className="app-drag flex w-56 flex-shrink-0 flex-col border-r border-[var(--color-border)] bg-[var(--color-surface)] px-3 pb-3 pt-10">
        <div className="app-no-drag mb-6 flex items-center gap-2 px-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--color-accent-soft)] text-sm font-bold text-[var(--color-accent-hover)]">
            ⇄
          </span>
          <span className="font-semibold tracking-tight">EP-DSID</span>
        </div>

        <nav className="flex flex-col gap-1">
          <NavLink to="/networks" className={navItemClass}>
            <span>🗂</span> Redes
          </NavLink>
          <NavLink to="/transfers" className={navItemClass}>
            <span>↕</span> Transferências
          </NavLink>
          <NavLink to="/workspace" className={navItemClass}>
            <span>📁</span> Workspace
          </NavLink>
        </nav>

        <div className="mt-auto border-t border-[var(--color-border)] pt-3">
          {session && (
            <div className="app-no-drag flex items-center justify-between gap-2 px-1">
              <span className="truncate text-sm text-[var(--color-muted)]" title={session.username}>
                {session.username}
              </span>
              <Button variant="ghost" size="sm" onClick={handleLogout}>
                Sair
              </Button>
            </div>
          )}
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto">
        <div className="app-drag h-8 w-full" />
        <div className="app-no-drag mx-auto max-w-5xl px-8 pb-10">{children}</div>
      </main>
    </div>
  )
}
