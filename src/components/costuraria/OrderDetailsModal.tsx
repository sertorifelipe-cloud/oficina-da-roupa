import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Check, ArrowRight, Package } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import type { Order, OrderStatus } from '@/types/database'
import { supabase } from '@/lib/supabaseClient'
import { toast } from 'sonner'
import { useState } from 'react'

interface OrderDetailsModalProps {
  order: Order | null
  isOpen: boolean
  onClose: () => void
  onUpdate: () => void
}

const statusConfig = {
  recebido: { label: 'Recebido', bg: 'bg-gray-100', text: 'text-gray-800' },
  em_andamento: { label: 'Em andamento', bg: 'bg-yellow-100', text: 'text-yellow-800' },
  pronto: { label: 'Pronto', bg: 'bg-green-100', text: 'text-green-800' },
  entregue: { label: 'Entregue', bg: 'bg-purple-100', text: 'text-purple-900' },
}

export function OrderDetailsModal({ order, isOpen, onClose, onUpdate }: OrderDetailsModalProps) {
  const [isUpdating, setIsUpdating] = useState(false)

  if (!order) return null

  const statusInfo = statusConfig[order.status]

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return '-'
    const date = new Date(dateStr.includes('T') ? dateStr : `${dateStr}T12:00:00`)
    return format(date, 'dd/MM/yyyy', { locale: ptBR })
  }

  const formatCurrency = (value?: number | null) => {
    if (value === undefined || value === null) return 'R$ 0,00'
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
  }

  async function handleStatusChange(newStatus: OrderStatus, confirmDelivery: boolean = false) {
    setIsUpdating(true)
    try {
      const updateData: any = { status: newStatus }
      
      if (confirmDelivery) {
        updateData.delivery_date = new Date().toISOString().split('T')[0] // Formato YYYY-MM-DD
      }

      const { error } = await supabase
        .from('orders')
        .update(updateData)
        .eq('id', order!.id)

      if (error) throw error

      if (confirmDelivery) {
        toast.success('Pedido marcado como entregue!')
      } else {
        toast.success(`Status atualizado para: ${statusConfig[newStatus].label}`)
      }
      
      onUpdate()
      onClose()
    } catch (error: any) {
      console.error('Erro ao atualizar status:', error)
      toast.error('Erro ao atualizar o pedido. Tente novamente.')
    } finally {
      setIsUpdating(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Comanda #${String(order.order_number).padStart(4, '0')}`}
    >
      <div className="space-y-6">
        {/* Info principal em 2 colunas */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-gray-50 p-6 rounded-xl border border-gray-100">
          <div>
            <p className="text-gray-500 text-[16px] mb-1">Cliente</p>
            <p className="text-[18px] font-bold text-gray-900">{order.client?.name ?? 'Não informado'}</p>
            {order.client?.phone && (
              <p className="text-[16px] text-gray-600 mt-1">{order.client.phone}</p>
            )}
          </div>
          <div>
            <p className="text-gray-500 text-[16px] mb-1">Serviço</p>
            <p className="text-[18px] font-bold text-gray-900">{order.service?.name ?? 'Não informado'}</p>
            <p className="text-[18px] font-bold text-purple-900 mt-1">{formatCurrency(order.price)}</p>
          </div>
        </div>

        {/* Datas e Status */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
          <div>
            <p className="text-gray-500 text-[16px] mb-1">Data de Entrada</p>
            <p className="text-[18px] font-medium text-gray-800">{formatDate(order.entry_date)}</p>
          </div>
          <div>
            <p className="text-gray-500 text-[16px] mb-1">Previsão</p>
            <p className="text-[18px] font-medium text-gray-800">{formatDate(order.expected_date)}</p>
          </div>
          <div className="col-span-2 md:col-span-1">
            <p className="text-gray-500 text-[16px] mb-1">Status Atual</p>
            <span className={`inline-block px-4 py-1.5 rounded-full text-[16px] font-bold ${statusInfo.bg} ${statusInfo.text}`}>
              {statusInfo.label}
            </span>
          </div>
        </div>

        {/* Descrição e Observações */}
        {order.description && (
          <div className="bg-white p-5 rounded-xl border border-gray-200">
            <p className="text-gray-500 text-[16px] mb-2 font-medium">Descrição do Serviço</p>
            <p className="text-[18px] text-gray-800 whitespace-pre-wrap">{order.description}</p>
          </div>
        )}

        {order.notes && (
          <div className="bg-white p-5 rounded-xl border border-gray-200">
            <p className="text-gray-500 text-[16px] mb-2 font-medium">Observações</p>
            <p className="text-[18px] text-gray-800 whitespace-pre-wrap">{order.notes}</p>
          </div>
        )}

        {order.delivery_date && order.status === 'entregue' && (
          <div className="bg-purple-50 p-5 rounded-xl border border-purple-100 flex items-center gap-3">
            <Package className="text-purple-700" size={24} />
            <div>
              <p className="text-purple-900 text-[16px] font-bold">Pedido Entregue</p>
              <p className="text-purple-700 text-[16px]">Data da entrega: {formatDate(order.delivery_date)}</p>
            </div>
          </div>
        )}

        {/* Ações / Botões (Apenas se não estiver entregue) */}
        {order.status !== 'entregue' && (
          <div className="pt-6 mt-6 border-t border-gray-200 flex flex-col gap-4">
            <h4 className="text-lg font-bold text-gray-800 mb-2">Atualizar Status:</h4>
            
            {order.status === 'recebido' && (
              <button
                disabled={isUpdating}
                onClick={() => handleStatusChange('em_andamento')}
                className="w-full flex items-center justify-center gap-2 h-[60px] rounded-xl text-[18px] font-bold text-yellow-800 bg-yellow-100 hover:bg-yellow-200 transition-colors focus-ring"
              >
                <ArrowRight size={24} />
                Marcar como Em andamento
              </button>
            )}

            {order.status === 'em_andamento' && (
              <button
                disabled={isUpdating}
                onClick={() => handleStatusChange('pronto')}
                className="w-full flex items-center justify-center gap-2 h-[60px] rounded-xl text-[18px] font-bold text-green-800 bg-green-100 hover:bg-green-200 transition-colors focus-ring"
              >
                <Check size={24} />
                Marcar como Pronto
              </button>
            )}

            {order.status === 'pronto' && (
              <button
                disabled={isUpdating}
                onClick={() => handleStatusChange('entregue', true)}
                className="w-full flex items-center justify-center gap-2 h-[60px] rounded-xl text-[20px] font-bold text-white bg-[#16a34a] hover:bg-[#15803d] transition-colors shadow-lg focus-ring"
              >
                <Check size={28} strokeWidth={3} />
                Confirmar entrega
              </button>
            )}
          </div>
        )}
      </div>
    </Modal>
  )
}
