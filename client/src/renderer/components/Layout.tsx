import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export function Layout({ children }: { children: React.ReactNode }) {
  const { session, logout } = useAuth()
  const navigate = useNavigate()

  function handleLogout() {
    logout()
    navigate('/login')
  }

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="sidebar-logo">EP-DSID</div>
        <nav className="sidebar-nav">
          <NavLink
            to="/networks"
            className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
          >
            Redes
          </NavLink>
        </nav>
        {session && (
          <div className="sidebar-user">
            <span className="username">{session.username}</span>
            <button className="btn btn-ghost btn-sm" onClick={handleLogout}>
              Sair
            </button>
          </div>
        )}
      </aside>
      <main className="main-content">{children}</main>
    </div>
  )
}
