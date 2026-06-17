import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Check, ArrowRight, Package, Printer } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import type { Order, OrderStatus } from '@/types/database'
import { supabase } from '@/lib/supabaseClient'
import { toast } from 'sonner'
import { useState, useEffect } from 'react'
import { printOrderInvoice } from '@/lib/printHelper'

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
  cancelado: { label: 'Cancelado', bg: 'bg-red-50', text: 'text-red-700' },
}

const paymentConfig = {
  dinheiro: 'Dinheiro',
  pix: 'Pix',
  cartao_debito: 'Débito',
  cartao_credito: 'Crédito',
}

export function OrderDetailsModal({ order, isOpen, onClose, onUpdate }: OrderDetailsModalProps) {
  const [isUpdating, setIsUpdating] = useState(false)
  const [localAmountPaid, setLocalAmountPaid] = useState<number>(0)
  const [showPaymentInput, setShowPaymentInput] = useState(false)
  const [paymentValue, setPaymentValue] = useState<number | ''>('')
  const [isSavingPayment, setIsSavingPayment] = useState(false)

  useEffect(() => {
    if (order) {
      setLocalAmountPaid(order.amount_paid || 0)
    }
  }, [order])

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

  async function handleRegisterPartialPayment() {
    if (paymentValue === '' || paymentValue <= 0) return
    
    setIsSavingPayment(true)
    try {
      const newAmountPaid = Number((localAmountPaid + Number(paymentValue)).toFixed(2))
      
      const { error } = await supabase
        .from('orders')
        .update({ amount_paid: newAmountPaid })
        .eq('id', order!.id)
        
      if (error) throw error
      
      toast.success(`Pagamento parcial de R$ ${Number(paymentValue).toFixed(2)} registrado!`)
      setLocalAmountPaid(newAmountPaid)
      setShowPaymentInput(false)
      setPaymentValue('')
      onUpdate()
    } catch (err) {
      console.error('Erro ao registrar pagamento:', err)
      toast.error('Erro ao registrar o pagamento.')
    } finally {
      setIsSavingPayment(false)
    }
  }

  async function handleDeliverAndPayAll(method: 'dinheiro' | 'pix' | 'cartao_debito' | 'cartao_credito') {
    setIsUpdating(true)
    try {
      const { error } = await supabase
        .from('orders')
        .update({ 
          status: 'entregue',
          amount_paid: order!.price,
          delivery_payment_method: method,
          delivery_date: new Date().toISOString().split('T')[0]
        })
        .eq('id', order!.id)

      if (error) throw error

      toast.success(`Pagamento via ${paymentConfig[method]} recebido e pedido entregue!`)
      onUpdate()
      onClose()
    } catch (err: any) {
      console.error('Erro ao entregar pedido:', err)
      toast.error('Erro ao registrar a entrega.')
    } finally {
      setIsUpdating(false)
    }
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

  async function handleCancelOrder() {
    if (!window.confirm('Deseja realmente cancelar este pedido? Esta ação não pode ser desfeita.')) {
      return
    }

    setIsUpdating(true)
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: 'cancelado' })
        .eq('id', order!.id)

      if (error) throw error

      toast.success('Pedido cancelado com sucesso!')
      onUpdate()
      onClose()
    } catch (error: any) {
      console.error('Erro ao cancelar pedido:', error)
      toast.error('Erro ao cancelar o pedido. Tente novamente.')
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
            <p className="text-[18px] font-bold text-gray-900 mb-2">{order.service?.name ?? 'Não informado'}</p>
            <div className="space-y-1 text-sm border-t border-gray-200 pt-2">
              <div className="flex justify-between">
                <span className="text-gray-500 font-medium">Valor Total:</span>
                <span className="font-bold text-gray-900">{formatCurrency(order.price)}</span>
              </div>
              <div className="flex justify-between text-emerald-700">
                <span className="font-medium">Valor Pago:</span>
                <span className="font-bold">
                  {formatCurrency(localAmountPaid)}
                  {order.payment_method && ` (${paymentConfig[order.payment_method as keyof typeof paymentConfig]})`}
                </span>
              </div>
              <div className="flex justify-between border-t border-dashed border-gray-200 pt-1 font-bold">
                {order.price - localAmountPaid > 0 ? (
                  <>
                    <span className="text-amber-700">Saldo Restante:</span>
                    <span className="text-amber-800">{formatCurrency(order.price - localAmountPaid)}</span>
                  </>
                ) : (
                  <>
                    <span className="text-emerald-700">Status Pagto:</span>
                    <span className="text-emerald-800">Totalmente Pago ✓</span>
                  </>
                )}
              </div>
            </div>

            {order.status !== 'entregue' && order.status !== 'cancelado' && order.price - localAmountPaid > 0 && (
              <div className="mt-3">
                {!showPaymentInput ? (
                  <button
                    type="button"
                    onClick={() => setShowPaymentInput(true)}
                    className="text-[14px] font-bold text-purple-900 hover:text-purple-700 underline"
                  >
                    + Registrar Pagamento Parcial
                  </button>
                ) : (
                  <div className="flex items-center gap-2 mt-2">
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      max={Number((order.price - localAmountPaid).toFixed(2))}
                      placeholder="Valor pago..."
                      value={paymentValue}
                      onChange={(e) => setPaymentValue(e.target.value === '' ? '' : Number(e.target.value))}
                      className="w-28 h-8 px-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-900 focus:border-transparent"
                    />
                    <button
                      type="button"
                      disabled={isSavingPayment || paymentValue === '' || paymentValue <= 0}
                      onClick={handleRegisterPartialPayment}
                      className="h-8 px-3 rounded-lg bg-purple-900 text-white text-xs font-bold hover:bg-purple-800 transition-colors disabled:opacity-50"
                    >
                      Salvar
                    </button>
                    <button
                      type="button"
                      onClick={() => { setShowPaymentInput(false); setPaymentValue(''); }}
                      className="text-xs font-medium text-gray-500 hover:text-gray-700"
                    >
                      Cancelar
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Alerta de Pagamento Pendente */}
        {order.status !== 'entregue' && order.status !== 'cancelado' && order.price - localAmountPaid > 0 && (
          <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-xl flex items-center gap-3">
            <span className="text-[20px]">⚠️</span>
            <div>
              <p className="text-amber-800 text-base font-bold">Atenção: Pagamento Pendente</p>
              <p className="text-amber-700 text-sm">
                Resta receber o saldo de <strong>{formatCurrency(order.price - localAmountPaid)}</strong> antes de realizar a entrega do produto.
              </p>
            </div>
          </div>
        )}

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
              {order.delivery_payment_method && (
                <p className="text-purple-700 text-[14px] mt-1">
                  Forma de Pagamento: {paymentConfig[order.delivery_payment_method as keyof typeof paymentConfig]}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Ação de Impressão de Comanda */}
        <div className="pt-4 border-t border-gray-100 flex justify-end">
          <button
            type="button"
            onClick={() => printOrderInvoice(order)}
            className="w-full sm:w-auto flex items-center justify-center gap-2 h-12 px-6 rounded-xl text-base font-bold text-purple-900 bg-purple-50 hover:bg-purple-100 border border-purple-200 transition-colors focus-ring"
          >
            <Printer size={20} />
            Imprimir Comprovante (A4)
          </button>
        </div>

        {/* Ações / Botões (Apenas se não estiver entregue) */}
        {order.status !== 'entregue' && order.status !== 'cancelado' && (
          <div className="pt-6 mt-6 border-t border-gray-200 flex flex-col gap-4">
            <h4 className="text-lg font-bold text-gray-800 mb-2">Atualizar Status:</h4>
            
            {order.status === 'recebido' && (
              <div className="flex flex-col sm:flex-row gap-4 w-full">
                <button
                  type="button"
                  disabled={isUpdating}
                  onClick={handleCancelOrder}
                  className="sm:w-1/3 flex items-center justify-center gap-2 h-[60px] rounded-xl text-[18px] font-bold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 transition-colors focus-ring"
                >
                  Cancelar Pedido
                </button>
                <button
                  disabled={isUpdating}
                  onClick={() => handleStatusChange('em_andamento')}
                  className="flex-1 flex items-center justify-center gap-2 h-[60px] rounded-xl text-[18px] font-bold text-yellow-800 bg-yellow-100 hover:bg-yellow-200 transition-colors focus-ring"
                >
                  <ArrowRight size={24} />
                  Marcar como Em andamento
                </button>
              </div>
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
              order.price - localAmountPaid > 0 ? (
                <div className="space-y-3 bg-amber-50 p-5 rounded-2xl border border-amber-200">
                  <p className="text-amber-900 font-bold text-[16px] mb-2">Selecione a Forma de Pagamento do Saldo (R$ {(order.price - localAmountPaid).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}):</p>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { id: 'dinheiro', label: 'Dinheiro' },
                      { id: 'pix', label: 'Pix' },
                      { id: 'cartao_debito', label: 'Débito' },
                      { id: 'cartao_credito', label: 'Crédito' },
                    ].map(method => (
                      <button
                        key={method.id}
                        type="button"
                        disabled={isUpdating}
                        onClick={() => handleDeliverAndPayAll(method.id as any)}
                        className="h-12 rounded-xl bg-amber-600 text-white font-bold hover:bg-amber-700 transition-colors text-sm focus-ring"
                      >
                        {method.label}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <button
                  disabled={isUpdating}
                  onClick={() => handleStatusChange('entregue', true)}
                  className="w-full flex items-center justify-center gap-2 h-[60px] rounded-xl text-[20px] font-bold text-white bg-[#16a34a] hover:bg-[#15803d] transition-colors shadow-lg focus-ring"
                >
                  <Check size={28} strokeWidth={3} />
                  Confirmar entrega (Totalmente Pago)
                </button>
              )
            )}
          </div>
        )}
      </div>
    </Modal>
  )
}
