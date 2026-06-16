import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Eye } from 'lucide-react'
import type { Order } from '@/types/database'

interface OrderCardProps {
  order: Order
  onViewDetails: (order: Order) => void
}

const statusConfig = {
  recebido: { label: 'Recebido', bg: 'bg-gray-100', text: 'text-gray-800' },
  em_andamento: { label: 'Em andamento', bg: 'bg-yellow-100', text: 'text-yellow-800' },
  pronto: { label: 'Pronto', bg: 'bg-green-100', text: 'text-green-800' },
  entregue: { label: 'Entregue', bg: 'bg-purple-100', text: 'text-purple-900' },
}

export function OrderCard({ order, onViewDetails }: OrderCardProps) {
  const statusInfo = statusConfig[order.status]

  // Formatação segura de datas
  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return '-'
    // Adiciona T00:00:00 para evitar erro de timezone se for apenas data
    const date = new Date(dateStr.includes('T') ? dateStr : `${dateStr}T12:00:00`)
    return format(date, 'dd/MM/yyyy', { locale: ptBR })
  }

  const formatCurrency = (value?: number | null) => {
    if (value === undefined || value === null) return 'R$ 0,00'
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
  }

  const clientName = order.client?.name ?? 'Cliente não informado'
  const serviceName = order.service?.name ?? 'Serviço não informado'

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow flex flex-col">
      <div className="p-5 flex-1">
        {/* Cabeçalho do Card */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <span className="inline-block px-3 py-1 rounded-lg bg-gray-100 text-gray-700 font-bold text-lg mb-2">
              #{String(order.order_number).padStart(4, '0')}
            </span>
            <h3 className="text-[18px] font-bold text-gray-900 leading-tight">
              {clientName}
            </h3>
            <p className="text-[16px] text-gray-500 mt-1">
              {serviceName}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[18px] font-bold text-purple-900">
              {formatCurrency(order.price)}
            </p>
            {order.price - (order.amount_paid || 0) > 0 && order.status !== 'entregue' && (
              <p className="text-xs text-amber-600 font-bold mt-1">
                Falta: {formatCurrency(order.price - (order.amount_paid || 0))}
              </p>
            )}
          </div>
        </div>

        {/* Informações Extras */}
        <div className="flex flex-col gap-3 mt-4 pt-4 border-t border-gray-100">
          <div className="flex items-center justify-between text-[16px]">
            <span className="text-gray-500">Entrada:</span>
            <span className="font-medium text-gray-800">{formatDate(order.entry_date)}</span>
          </div>
          <div className="flex items-center justify-between text-[16px]">
            <span className="text-gray-500">Previsão:</span>
            <span className="font-medium text-gray-800">{formatDate(order.expected_date)}</span>
          </div>
          <div className="flex items-center justify-between mt-2">
            <span className="text-gray-500 text-[16px]">Status:</span>
            <span className={`px-4 py-1.5 rounded-full text-sm font-bold ${statusInfo.bg} ${statusInfo.text}`}>
              {statusInfo.label}
            </span>
          </div>
        </div>
      </div>

      {/* Botão de Ação */}
      <div className="p-4 bg-gray-50 border-t border-gray-100">
        <button
          onClick={() => onViewDetails(order)}
          className="w-full flex items-center justify-center gap-2 h-[52px] rounded-xl text-[18px] font-semibold text-purple-900 bg-white border-2 border-purple-200 hover:bg-purple-50 transition-colors focus-ring"
        >
          <Eye size={20} />
          Ver detalhes
        </button>
      </div>
    </div>
  )
}
