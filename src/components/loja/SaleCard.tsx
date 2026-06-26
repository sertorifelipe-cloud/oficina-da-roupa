import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Receipt, Wallet, CreditCard, Banknote, Printer, ArrowRightLeft } from 'lucide-react'
import type { Sale } from '@/types/database'
import { printSaleInvoice } from '@/lib/printHelper'

interface SaleCardProps {
  sale: Sale
  onExchange?: (sale: Sale) => void
  onAddPayment?: (sale: Sale) => void
}

const paymentConfig = {
  dinheiro: { label: 'Dinheiro', icon: Banknote, bg: 'bg-emerald-100', text: 'text-emerald-800' },
  pix: { label: 'Pix', icon: Receipt, bg: 'bg-teal-100', text: 'text-teal-800' },
  cartao_debito: { label: 'Débito', icon: Wallet, bg: 'bg-blue-100', text: 'text-blue-800' },
  cartao_credito: { label: 'Crédito', icon: CreditCard, bg: 'bg-indigo-100', text: 'text-indigo-800' },
}

export function SaleCard({ sale, onExchange, onAddPayment }: SaleCardProps) {
  const formatCurrency = (value?: number | null) => {
    if (value === undefined || value === null) return 'R$ 0,00'
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
  }

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return '-'
    const date = new Date(dateStr)
    return format(date, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
  }

  const clientName = sale.client?.name || sale.client_name_free || 'Cliente não identificado'

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow flex flex-col">
      <div className="p-5 flex-1">
        {/* Topo: Data, Vendedor e Badge de Pagamento */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-[14px] text-gray-500 font-medium">
              {formatDate(sale.sale_date)}
            </p>
            {sale.users_profiles?.name && (
              <p className="text-xs text-purple-700 font-semibold mt-0.5">
                Vendedor: {sale.users_profiles.name}
              </p>
            )}
          </div>
          <div className="flex flex-col gap-1 items-end">
            {sale.status === 'pendente' && (
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-orange-100 text-orange-800 border border-orange-200">
                Pendente
              </div>
            )}
            {sale.payment_method && paymentConfig[sale.payment_method] && (
              <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${paymentConfig[sale.payment_method].bg} ${paymentConfig[sale.payment_method].text}`}>
                {(() => { const Icon = paymentConfig[sale.payment_method].icon; return <Icon size={14} /> })()}
                {paymentConfig[sale.payment_method].label}
                {sale.payment_method_2 && ` - ${formatCurrency(sale.payment_amount_1)}`}
              </div>
            )}
            {sale.payment_method_2 && paymentConfig[sale.payment_method_2] && (
              <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${paymentConfig[sale.payment_method_2].bg} ${paymentConfig[sale.payment_method_2].text}`}>
                {(() => { const Icon = paymentConfig[sale.payment_method_2].icon; return <Icon size={14} /> })()}
                {paymentConfig[sale.payment_method_2].label}
                {` - ${formatCurrency(sale.payment_amount_2)}`}
              </div>
            )}
          </div>
        </div>

        {/* Cliente */}
        <h3 className="text-[18px] font-bold text-gray-900 leading-tight mb-4">
          {clientName}
        </h3>

        {/* Lista de Itens */}
        <div className="space-y-3 bg-gray-50 p-4 rounded-xl border border-gray-100">
          {sale.items.map((item, index) => (
            <div key={index} className="flex justify-between items-start text-[16px]">
              <div className="pr-4">
                <span className="font-medium text-gray-800">{item.name}</span>
                <p className="text-gray-500 text-sm mt-0.5">{item.quantity}x {formatCurrency(item.unit_price)}</p>
              </div>
              <span className="font-semibold text-gray-700 whitespace-nowrap">
                {formatCurrency(item.total)}
              </span>
            </div>
          ))}
        </div>
        
        {/* Observações */}
        {sale.notes && (
          <p className="mt-4 text-[14px] text-gray-500 line-clamp-2 italic">
            Obs: {sale.notes}
          </p>
        )}
      </div>

      {/* Rodapé: Total */}
      <div className={`${sale.status === 'pendente' ? 'bg-orange-600' : 'bg-purple-900'} text-white p-5 flex flex-col gap-2`}>
        <div className="flex items-center justify-between">
          <div>
            <p className={`${sale.status === 'pendente' ? 'text-orange-200' : 'text-purple-200'} text-sm`}>Total da venda</p>
            {sale.discount > 0 && (
              <p className={`${sale.status === 'pendente' ? 'text-orange-300' : 'text-purple-300'} text-xs mt-0.5`}>Desconto: {formatCurrency(sale.discount)}</p>
            )}
          </div>
          <p className="text-[24px] font-bold">
            {formatCurrency(sale.total)}
          </p>
        </div>
        {sale.status === 'pendente' && (
          <div className="flex items-center justify-between pt-2 border-t border-orange-400 border-dashed">
            <p className="text-orange-100 text-sm font-semibold">Valor Pendente</p>
            <p className="text-xl font-bold text-white">
              {formatCurrency((sale.total || 0) - (sale.amount_paid || 0))}
            </p>
          </div>
        )}
      </div>

      {/* Ações: Imprimir + Troca */}
      <div className="p-3 bg-gray-50 border-t border-gray-100 flex flex-col gap-2">
        {sale.status === 'pendente' && onAddPayment && (
          <button
            onClick={() => onAddPayment(sale)}
            className="w-full flex items-center justify-center gap-2 h-11 rounded-xl font-bold text-[14px] text-white bg-orange-600 hover:bg-orange-700 transition-all cursor-pointer focus-ring"
          >
            <Wallet size={16} /> Receber Pagamento
          </button>
        )}
        <div className="flex gap-2 w-full">
          <button
            onClick={() => printSaleInvoice(sale)}
            className="flex-1 flex items-center justify-center gap-2 h-11 rounded-xl font-bold text-[14px] text-purple-900 bg-white border border-purple-200 hover:bg-purple-50 transition-all cursor-pointer focus-ring"
          >
            <Printer size={16} /> Imprimir
          </button>
          {onExchange && (
            <button
              onClick={() => onExchange(sale)}
              className="flex-1 flex items-center justify-center gap-2 h-11 rounded-xl font-bold text-[14px] text-amber-800 bg-amber-50 border border-amber-200 hover:bg-amber-100 transition-all cursor-pointer focus-ring"
            >
              <ArrowRightLeft size={16} /> Registrar Troca
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

