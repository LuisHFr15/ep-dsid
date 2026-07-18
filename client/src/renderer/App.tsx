import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { Layout } from './components/Layout'
import { LoginPage } from './pages/LoginPage'
import { NetworksPage } from './pages/NetworksPage'
import { NetworkDetailPage } from './pages/NetworkDetailPage'

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { session } = useAuth()
  return session ? <>{children}</> : <Navigate to="/login" replace />
}

function AppRoutes() {
  const { session } = useAuth()
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
      <Route path="*" element={<Navigate to="/networks" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <HashRouter>
        <AppRoutes />
      </HashRouter>
    </AuthProvider>
  )
}
