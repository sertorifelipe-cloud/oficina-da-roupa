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
  User,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'

// -------------------------------------------------------
// Itens de navegação
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

export function Sidebar() {
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()

  async function handleSignOut() {
    await signOut()
    navigate('/login', { replace: true })
  }

  const isAdmin = profile?.role === 'admin'
  const role = profile?.role || 'operador'

  // Lógica de permissões por cargo
  const filteredNavItems = navItems.filter(item => {
    // Relatórios são exclusivos de Admin
    if (item.to === '/relatorios') return isAdmin

    if (isAdmin || role === 'operador') return true
    
    if (role === 'vendedor') {
      return ['/dashboard', '/loja', '/clientes', '/estoque'].includes(item.to)
    }
    
    if (role === 'costureiro') {
      return ['/dashboard', '/costuraria', '/clientes'].includes(item.to)
    }
    
    return false
  })

  return (
    <aside className="hidden md:flex flex-col w-60 min-h-screen bg-white border-r border-gray-200 shrink-0">
      {/* Logo / nome */}
      <div className="flex items-center gap-3 px-6 py-6 border-b border-gray-100">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-900 text-white shrink-0">
          <Scissors size={20} />
        </div>
        <div>
          <p className="font-bold text-purple-900 text-base leading-tight">Oficina da Roupa</p>
          <p className="text-xs text-gray-500">Gestão</p>
        </div>
      </div>

      {/* Navegação */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {filteredNavItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              [
                'flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-base font-medium',
                isActive
                  ? 'bg-purple-100 text-purple-900 font-semibold'
                  : 'text-gray-700 hover:bg-gray-100 hover:text-purple-900',
              ].join(' ')
            }
          >
            {({ isActive }) => (
              <>
                <Icon
                  size={20}
                  className={isActive ? 'text-purple-900' : 'text-gray-500'}
                />
                <span>{label}</span>
              </>
            )}
          </NavLink>
        ))}

        {/* Configurações — somente admin */}
        {isAdmin &&
          adminItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                [
                  'flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-base font-medium',
                  isActive
                    ? 'bg-purple-100 text-purple-900 font-semibold'
                    : 'text-gray-700 hover:bg-gray-100 hover:text-purple-900',
                ].join(' ')
              }
            >
              {({ isActive }) => (
                <>
                  <Icon
                    size={20}
                    className={isActive ? 'text-purple-900' : 'text-gray-500'}
                  />
                  <span>{label}</span>
                </>
              )}
            </NavLink>
          ))}
      </nav>

      {/* Rodapé: usuário + sair */}
      <div className="border-t border-gray-100 px-4 py-4 space-y-2">
        {/* Usuário logado */}
        <div className="flex items-center gap-3 px-2 py-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-purple-100 shrink-0">
            <User size={18} className="text-purple-900" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-800 truncate">
              {profile?.name ?? 'Usuário'}
            </p>
            <p className="text-xs text-gray-500 capitalize">
              {profile?.role ?? ''}
            </p>
          </div>
        </div>

        {/* Botão Sair */}
        <button
          onClick={handleSignOut}
          className="flex items-center gap-3 w-full px-4 py-3 rounded-lg text-base font-medium text-red-600 hover:bg-red-50 transition-colors"
        >
          <LogOut size={20} />
          <span>Sair</span>
        </button>
      </div>
    </aside>
  )
}
