import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Receipt, Wallet, CreditCard, Banknote, Printer } from 'lucide-react'
import type { Sale } from '@/types/database'
import { printSaleInvoice } from '@/lib/printHelper'

interface SaleCardProps {
  sale: Sale
}

const paymentConfig = {
  dinheiro: { label: 'Dinheiro', icon: Banknote, bg: 'bg-emerald-100', text: 'text-emerald-800' },
  pix: { label: 'Pix', icon: Receipt, bg: 'bg-teal-100', text: 'text-teal-800' },
  cartao_debito: { label: 'Débito', icon: Wallet, bg: 'bg-blue-100', text: 'text-blue-800' },
  cartao_credito: { label: 'Crédito', icon: CreditCard, bg: 'bg-indigo-100', text: 'text-indigo-800' },
}

export function SaleCard({ sale }: SaleCardProps) {
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
  const paymentInfo = sale.payment_method ? paymentConfig[sale.payment_method] : null
  const PaymentIcon = paymentInfo?.icon

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
          {paymentInfo && PaymentIcon && (
            <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-bold ${paymentInfo.bg} ${paymentInfo.text}`}>
              <PaymentIcon size={16} />
              {paymentInfo.label}
            </div>
          )}
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
      <div className="bg-purple-900 text-white p-5 flex items-center justify-between">
        <div>
          <p className="text-purple-200 text-sm">Total da venda</p>
          {sale.discount > 0 && (
            <p className="text-purple-300 text-xs mt-0.5">Desconto: {formatCurrency(sale.discount)}</p>
          )}
        </div>
        <p className="text-[24px] font-bold">
          {formatCurrency(sale.total)}
        </p>
      </div>

      {/* Ações: Imprimir */}
      <div className="p-3 bg-gray-50 border-t border-gray-100 flex gap-2">
        <button
          onClick={() => printSaleInvoice(sale)}
          className="w-full flex items-center justify-center gap-2 h-11 rounded-xl font-bold text-[14px] text-purple-900 bg-white border border-purple-200 hover:bg-purple-50 transition-all cursor-pointer focus-ring"
        >
          <Printer size={16} /> Imprimir Comprovante (A4)
        </button>
      </div>
    </div>
  )
}
