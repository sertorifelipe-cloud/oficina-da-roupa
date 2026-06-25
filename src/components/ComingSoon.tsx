import type { LucideIcon } from 'lucide-react'
import { Clock } from 'lucide-react'

interface ComingSoonProps {
  title: string
  description?: string
  icon?: LucideIcon
}

/**
 * Componente de placeholder "Em breve" para páginas internas
 */
export function ComingSoon({
  title,
  description = 'Esta funcionalidade está sendo preparada para você.',
  icon: Icon = Clock,
}: ComingSoonProps) {
  return (
    <div className="space-y-6">
      {/* Cabeçalho da página */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
        <div className="mt-1 h-1 w-12 rounded-full bg-purple-900" />
      </div>

      {/* Card "Em breve" */}
      <div className="flex flex-col items-center justify-center min-h-[360px] rounded-2xl bg-white border border-gray-200 shadow-sm px-8 py-12 text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-purple-100 mb-6">
          <Icon size={40} className="text-purple-900" />
        </div>
        <h2 className="text-xl font-bold text-gray-800 mb-3">Em breve</h2>
        <p className="text-base text-gray-500 max-w-sm leading-relaxed">{description}</p>

        <div className="mt-8 flex items-center gap-2 text-sm text-purple-700 font-medium bg-purple-50 px-5 py-3 rounded-xl">
          <Clock size={16} />
          <span>Estamos trabalhando nisso!</span>
        </div>
      </div>
    </div>
  )
}
