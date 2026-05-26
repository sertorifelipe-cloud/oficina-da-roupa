import { Edit2, Trash2 } from 'lucide-react'
import type { Service } from '@/types/database'
import { useAuth } from '@/contexts/AuthContext'

interface ServiceCardProps {
  service: Service
  onEdit: (service: Service) => void
  onDelete: (service: Service) => void
  onToggleActive: (service: Service) => void
}

export function ServiceCard({ service, onEdit, onDelete, onToggleActive }: ServiceCardProps) {
  const { profile } = useAuth()
  const isAdmin = profile?.role === 'admin'

  const formatCurrency = (value?: number | null) => {
    if (value === undefined || value === null) return 'R$ 0,00'
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
  }

  const categoryBadge = service.category === 'costuraria' 
    ? { bg: 'bg-purple-100', text: 'text-purple-900', label: 'Costuraria' }
    : { bg: 'bg-emerald-100', text: 'text-emerald-900', label: 'Loja' }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow flex flex-col">
      <div className="p-6 flex-1">
        <div className="flex items-start justify-between mb-3">
          <h3 className="text-[18px] font-bold text-gray-900 leading-tight pr-4">
            {service.name}
          </h3>
          <span className={`px-3 py-1 rounded-full text-sm font-bold shrink-0 ${categoryBadge.bg} ${categoryBadge.text}`}>
            {categoryBadge.label}
          </span>
        </div>

        <p className="text-2xl font-bold text-gray-800 mb-4">
          {formatCurrency(service.base_price)}
        </p>

        {/* Toggle Ativo/Inativo Grande */}
        <button
          onClick={() => onToggleActive(service)}
          className={`w-full flex items-center justify-between px-4 h-14 rounded-xl font-bold text-[16px] transition-colors focus-ring border ${
            service.active 
              ? 'bg-green-50 border-green-200 text-green-800 hover:bg-green-100' 
              : 'bg-gray-100 border-gray-200 text-gray-600 hover:bg-gray-200'
          }`}
        >
          <span>{service.active ? 'Status: Ativo' : 'Status: Inativo'}</span>
          <div className={`w-12 h-6 rounded-full p-1 transition-colors ${service.active ? 'bg-green-500' : 'bg-gray-300'}`}>
            <div className={`w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-200 ${service.active ? 'translate-x-6' : 'translate-x-0'}`} />
          </div>
        </button>

        {service.description && (
          <p className="mt-4 text-[16px] text-gray-500 line-clamp-2" title={service.description}>
            {service.description}
          </p>
        )}
      </div>

      <div className="flex border-t border-gray-100">
        <button
          onClick={() => onEdit(service)}
          className="flex-1 flex items-center justify-center gap-2 h-[52px] text-[16px] font-bold text-gray-700 bg-white hover:bg-gray-50 transition-colors focus-ring border-r border-gray-100"
        >
          <Edit2 size={18} />
          Editar
        </button>
        
        {isAdmin && (
          <button
            onClick={() => onDelete(service)}
            className="flex-1 flex items-center justify-center gap-2 h-[52px] text-[16px] font-bold text-red-600 bg-white hover:bg-red-50 transition-colors focus-ring"
          >
            <Trash2 size={18} />
            Excluir
          </button>
        )}
      </div>
    </div>
  )
}
