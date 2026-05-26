import { Navigate, Route, Routes } from 'react-router-dom'
import { ProtectedRoute } from './ProtectedRoute'
import { AppLayout } from '@/components/layout/AppLayout'
import { LoginPage } from '@/pages/LoginPage'
import { DashboardPage } from '@/pages/DashboardPage'
import { CosturariaPage } from '@/pages/CosturariaPage'
import { LojaPage } from '@/pages/LojaPage'
import { ClientesPage } from '@/pages/ClientesPage'
import { ServicosPage } from '@/pages/ServicosPage'
import { EstoquePage } from '@/pages/EstoquePage'
import { RelatoriosPage } from '@/pages/RelatoriosPage'
import { ConfiguracoesPage } from '@/pages/ConfiguracoesPage'

export function AppRouter() {
  return (
    <Routes>
      {/* Rota pública */}
      <Route path="/login" element={<LoginPage />} />

      {/* Rotas protegidas */}
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/costuraria" element={<CosturariaPage />} />
          <Route path="/loja" element={<LojaPage />} />
          <Route path="/clientes" element={<ClientesPage />} />
          <Route path="/servicos" element={<ServicosPage />} />
          <Route path="/estoque" element={<EstoquePage />} />
          <Route path="/relatorios" element={<RelatoriosPage />} />
          <Route path="/configuracoes" element={<ConfiguracoesPage />} />
        </Route>
      </Route>

      {/* Redireciona raiz para /dashboard */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />

      {/* Qualquer rota não encontrada → /dashboard */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}
