import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { ToastProvider, Spinner } from './components/ui'
import { Layout } from './components/Layout'
import { LoginPage } from './pages/LoginPage'
import { NetworksPage } from './pages/NetworksPage'
import { NetworkDetailPage } from './pages/NetworkDetailPage'
import { WorkspacePage } from './pages/WorkspacePage'

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { session } = useAuth()
  return session ? <>{children}</> : <Navigate to="/login" replace />
}

function AppRoutes() {
  const { session, loading } = useAuth()

  // Evita flicker de redirect enquanto a sessão é hidratada do main.
  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Spinner size={28} />
      </div>
    )
  }

  return (
    <Routes>
      <Route
        path="/login"
        element={session ? <Navigate to="/networks" replace /> : <LoginPage />}
      />
      <Route
        path="/networks"
        element={
          <PrivateRoute>
            <Layout><NetworksPage /></Layout>
          </PrivateRoute>
        }
      />
      <Route
        path="/networks/:id"
        element={
          <PrivateRoute>
            <Layout><NetworkDetailPage /></Layout>
          </PrivateRoute>
        }
      />
      <Route
        path="/workspace"
        element={
          <PrivateRoute>
            <Layout><WorkspacePage /></Layout>
          </PrivateRoute>
        }
      />
      <Route path="*" element={<Navigate to="/networks" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <HashRouter>
          <AppRoutes />
        </HashRouter>
      </AuthProvider>
    </ToastProvider>
  )
}
