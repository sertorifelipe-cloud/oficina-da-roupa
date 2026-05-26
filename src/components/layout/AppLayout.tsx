import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { MobileHeader } from './MobileHeader'

/**
 * Layout principal: Sidebar (desktop) + MobileHeader + área de conteúdo
 */
export function AppLayout() {
  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar — visível apenas em telas md+ */}
      <Sidebar />

      {/* Conteúdo principal */}
      <div className="flex flex-col flex-1 min-w-0">
        {/* Header mobile */}
        <MobileHeader />

        {/* Área de conteúdo */}
        <main className="flex-1 px-4 py-6 md:px-8 md:py-8 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
