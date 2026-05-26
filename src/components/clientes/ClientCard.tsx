import { Edit2, Trash2 } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type { Client } from '@/types/database'
import { useAuth } from '@/contexts/AuthContext'

interface ClientCardProps {
  client: Client
  onEdit: (client: Client) => void
  onDelete: (client: Client) => void
}

export function ClientCard({ client, onEdit, onDelete }: ClientCardProps) {
  const { profile } = useAuth()
  const isAdmin = profile?.role === 'admin'

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return '-'
    const date = new Date(dateStr)
    return format(date, 'dd/MM/yyyy', { locale: ptBR })
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow flex flex-col">
      <div className="p-6 flex-1">
        <h3 className="text-[18px] font-bold text-gray-900 leading-tight mb-2">
          {client.name}
        </h3>
        
        <div className="space-y-1 mb-4">
          <p className="text-[16px] text-gray-500">
            {client.phone || 'Sem telefone'}
          </p>
          <p className="text-[16px] text-gray-500 truncate" title={client.email || ''}>
            {client.email || 'Sem e-mail'}
          </p>
        </div>

        <p className="text-[14px] font-medium text-purple-900 bg-purple-50 inline-block px-3 py-1 rounded-lg">
          Cliente desde {formatDate(client.created_at)}
        </p>

        {client.notes && (
          <div className="mt-4 p-3 bg-gray-50 rounded-xl border border-gray-100">
            <p className="text-sm text-gray-600 line-clamp-2" title={client.notes}>
              {client.notes}
            </p>
          </div>
        )}
      </div>

      <div className="flex border-t border-gray-100">
        <button
          onClick={() => onEdit(client)}
          className="flex-1 flex items-center justify-center gap-2 h-[52px] text-[16px] font-bold text-gray-700 bg-white hover:bg-gray-50 transition-colors focus-ring border-r border-gray-100"
        >
          <Edit2 size={18} />
          Editar
        </button>
        
        {isAdmin && (
          <button
            onClick={() => onDelete(client)}
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
