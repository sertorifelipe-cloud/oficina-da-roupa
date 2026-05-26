import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'

/**
 * Rota protegida: se não autenticado → redireciona para /login
 * Se ainda carregando → mostra tela de espera simples
 */
export function ProtectedRoute() {
  const { user, profile, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <p className="text-lg text-gray-600">Carregando...</p>
      </div>
    )
  }

  if (!user || (profile && profile.is_active === false)) {
    return <Navigate to="/login" replace />
  }

  return <Outlet />
}
