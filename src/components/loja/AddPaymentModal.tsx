import { useState } from 'react'
import { Loader2, Banknote, Receipt, Wallet, CreditCard } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { supabase } from '@/lib/supabaseClient'
import { toast } from 'sonner'
import type { Sale, PaymentMethod } from '@/types/database'

interface AddPaymentModalProps {
  isOpen: boolean
  sale: Sale | null
  onClose: () => void
  onSuccess: () => void
}

const paymentOptions = [
  { id: 'dinheiro', label: 'Dinheiro', icon: Banknote },
  { id: 'pix', label: 'Pix', icon: Receipt },
  { id: 'cartao_debito', label: 'Débito', icon: Wallet },
  { id: 'cartao_credito', label: 'Crédito', icon: CreditCard },
] as const

export function AddPaymentModal({ isOpen, sale, onClose, onSuccess }: AddPaymentModalProps) {
  const [amount, setAmount] = useState<string>('')
  const [method, setMethod] = useState<PaymentMethod>('dinheiro')
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (!sale) return null

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)

  const pendingAmount = (sale.total || 0) - (sale.amount_paid || 0)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const amountNum = parseFloat(amount.replace(/\./g, '').replace(',', '.'))
    if (!amountNum || amountNum <= 0) {
      return toast.error('Digite um valor válido.')
    }
    
    if (amountNum > pendingAmount) {
      return toast.error(`O valor não pode ser maior que o pendente (${formatCurrency(pendingAmount)}).`)
    }

    setIsSubmitting(true)
    try {
      const newAmountPaid = (sale.amount_paid || 0) + amountNum
      // Para lidar com pontos flutuantes ao comparar
      const isFullyPaid = (newAmountPaid + 0.01) >= (sale.total || 0)
      
      const newPayment = {
        amount: amountNum,
        method,
        date: new Date().toISOString()
      }

      const paymentHistory = Array.isArray(sale.payment_history) ? sale.payment_history : []
      const newHistory = [...paymentHistory, newPayment]

      const { error } = await supabase
        .from('sales')
        .update({
          amount_paid: newAmountPaid,
          status: isFullyPaid ? 'concluida' : 'pendente',
          payment_history: newHistory
        })
        .eq('id', sale.id)

      if (error) throw error

      toast.success('Pagamento registrado com sucesso!')
      onSuccess()
    } catch (err) {
      console.error('Erro ao adicionar pagamento:', err)
      toast.error('Ocorreu um erro ao registrar o pagamento.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Receber Pagamento Pendente" maxWidth="max-w-md">
      <form onSubmit={handleSubmit} className="space-y-6">
        
        <div className="bg-orange-50 text-orange-800 p-4 rounded-xl flex justify-between items-center border border-orange-100">
          <span className="font-medium">Valor Pendente</span>
          <span className="text-xl font-bold">{formatCurrency(pendingAmount)}</span>
        </div>

        <div>
          <label className="block text-[14px] font-bold text-gray-700 mb-2">Forma de Pagamento</label>
          <div className="grid grid-cols-2 gap-3">
            {paymentOptions.map((opt) => {
              const Icon = opt.icon
              const isSelected = method === opt.id
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setMethod(opt.id as PaymentMethod)}
                  className={`
                    flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all
                    ${isSelected 
                      ? `border-purple-900 bg-purple-50 text-purple-900 shadow-sm scale-[0.98]` 
                      : 'border-gray-100 bg-white text-gray-500 hover:border-gray-200 hover:bg-gray-50'}
                  `}
                >
                  <Icon size={24} className="mb-2" />
                  <span className="text-sm font-bold">{opt.label}</span>
                </button>
              )
            })}
          </div>
        </div>

        <Input
          label="Valor a pagar agora"
          value={amount}
          onChange={(e) => {
            let v = e.target.value.replace(/\D/g, '')
            v = (Number(v) / 100).toFixed(2)
            if (v === '0.00' && e.target.value.length === 0) v = ''
            else v = v.replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.')
            setAmount(v)
          }}
          placeholder="0,00"
          prefixNode={<span className="font-bold text-gray-500 ml-2">R$</span>}
        />

        <div className="pt-4 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 px-4 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isSubmitting || !amount}
            className="flex-1 py-3 px-4 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition-colors disabled:opacity-50 flex justify-center items-center"
          >
            {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Confirmar Pagamento'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
