import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  Scissors,
  ShoppingBag,
  Users,
  Tag,
  Package,
  BarChart2,
  Settings,
  LogOut,
  Menu,
  X,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'

// -------------------------------------------------------
// Itens de navegação (igual à Sidebar)
// -------------------------------------------------------

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/costuraria', icon: Scissors, label: 'Costuraria' },
  { to: '/loja', icon: ShoppingBag, label: 'Loja' },
  { to: '/clientes', icon: Users, label: 'Clientes' },
  { to: '/servicos', icon: Tag, label: 'Serviços' },
  { to: '/estoque', icon: Package, label: 'Estoque' },
  { to: '/relatorios', icon: BarChart2, label: 'Relatórios' },
]

const adminItems = [
  { to: '/configuracoes', icon: Settings, label: 'Configurações' },
]

// -------------------------------------------------------
// Componente
// -------------------------------------------------------

export function MobileHeader() {
  const [isOpen, setIsOpen] = useState(false)
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()

  const isAdmin = profile?.role === 'admin'

  async function handleSignOut() {
    setIsOpen(false)
    await signOut()
    navigate('/login', { replace: true })
  }

  function handleNavClick() {
    setIsOpen(false)
  }

  return (
    <>
      {/* Header fixo */}
      <header className="md:hidden fixed top-0 left-0 right-0 z-40 flex items-center justify-between bg-white border-b border-gray-200 px-4 h-16">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-900 text-white">
            <Scissors size={16} />
          </div>
          <span className="font-bold text-purple-900 text-base">Oficina da Roupa</span>
        </div>

        <button
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-700"
          aria-label="Abrir menu"
        >
          <Menu size={24} />
        </button>
      </header>

      {/* Espaçador para o conteúdo não ficar atrás do header */}
      <div className="md:hidden h-16" />

      {/* Overlay escuro */}
      {isOpen && (
        <div
          className="md:hidden fixed inset-0 z-50 bg-black/40"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Drawer lateral */}
      <div
        className={[
          'md:hidden fixed top-0 left-0 bottom-0 z-50 w-72 bg-white shadow-2xl flex flex-col transition-transform duration-300',
          isOpen ? 'translate-x-0' : '-translate-x-full',
        ].join(' ')}
      >
        {/* Cabeçalho do drawer */}
        <div className="flex items-center justify-between px-5 py-5 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-900 text-white shrink-0">
              <Scissors size={20} />
            </div>
            <div>
              <p className="font-bold text-purple-900 text-base leading-tight">Oficina da Roupa</p>
              <p className="text-xs text-gray-500">Gestão</p>
            </div>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            aria-label="Fechar menu"
          >
            <X size={22} className="text-gray-500" />
          </button>
        </div>

        {/* Usuário */}
        <div className="px-5 py-4 border-b border-gray-100">
          <p className="text-base font-semibold text-gray-800">{profile?.name ?? 'Usuário'}</p>
          <p className="text-sm text-gray-500 capitalize">{profile?.role ?? ''}</p>
        </div>

        {/* Navegação */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              onClick={handleNavClick}
              className={({ isActive }) =>
                [
                  'flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-base font-medium',
                  isActive
                    ? 'bg-purple-100 text-purple-900 font-semibold'
                    : 'text-gray-700 hover:bg-gray-100',
                ].join(' ')
              }
            >
              {({ isActive }) => (
                <>
                  <Icon size={20} className={isActive ? 'text-purple-900' : 'text-gray-500'} />
                  <span>{label}</span>
                </>
              )}
            </NavLink>
          ))}

          {isAdmin &&
            adminItems.map(({ to, icon: Icon, label }) => (
              <NavLink
                key={to}
                to={to}
                onClick={handleNavClick}
                className={({ isActive }) =>
                  [
                    'flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-base font-medium',
                    isActive
                      ? 'bg-purple-100 text-purple-900 font-semibold'
                      : 'text-gray-700 hover:bg-gray-100',
                  ].join(' ')
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon size={20} className={isActive ? 'text-purple-900' : 'text-gray-500'} />
                    <span>{label}</span>
                  </>
                )}
              </NavLink>
            ))}
        </nav>

        {/* Botão Sair */}
        <div className="border-t border-gray-100 px-4 py-4">
          <button
            onClick={handleSignOut}
            className="flex items-center gap-3 w-full px-4 py-3 rounded-lg text-base font-medium text-red-600 hover:bg-red-50 transition-colors"
          >
            <LogOut size={20} />
            <span>Sair</span>
          </button>
        </div>
      </div>
    </>
  )
}
