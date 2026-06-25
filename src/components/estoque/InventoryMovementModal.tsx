import { useState, useEffect } from 'react'
import { Loader2, ArrowDownToLine, ArrowUpFromLine } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { supabase } from '@/lib/supabaseClient'
import { toast } from 'sonner'
import type { InventoryItem } from '@/types/database'
import { useAuth } from '@/contexts/AuthContext'

interface InventoryMovementModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  item: InventoryItem | null
  type: 'in' | 'out' | null
}

export function InventoryMovementModal({ isOpen, onClose, onSuccess, item, type }: InventoryMovementModalProps) {
  const { profile, user } = useAuth()
  const [quantity, setQuantity] = useState<number | ''>('')
  const [reason, setReason] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setQuantity('')
      setReason('')
    }
  }, [isOpen])

  if (!item || !type) return null

  const isInput = type === 'in'
  const title = isInput ? 'Registrar Entrada' : 'Registrar Saída'
  const buttonColor = isInput ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'
  const Icon = isInput ? ArrowDownToLine : ArrowUpFromLine

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (quantity === '' || quantity <= 0) {
      return toast.error('Informe uma quantidade válida.')
    }

    if (!isInput && quantity > item.current_quantity) {
      return toast.error(`A saída não pode ser maior que o estoque atual (${item.current_quantity}).`)
    }

    setIsSubmitting(true)
    try {
      const movementData = {
        item_id: item.id,
        type: isInput ? 'entrada' : 'saida',
        quantity: Number(quantity),
        reason: reason || null,
        created_by: profile?.id || user?.id
      }

      const { error } = await supabase.from('inventory_movements').insert([movementData])
      
      if (error) throw error

      toast.success(`${isInput ? 'Entrada' : 'Saída'} registrada com sucesso!`)
      onSuccess()
    } catch (error) {
      console.error('Erro ao registrar movimentação:', error)
      toast.error('Ocorreu um erro ao registrar. Tente novamente.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} maxWidth="max-w-lg">
      <form onSubmit={handleSubmit} className="space-y-6">
        
        {/* Item Summary */}
        <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 flex justify-between items-center">
          <div>
            <p className="text-gray-500 text-sm">Item</p>
            <p className="text-lg font-bold text-gray-900">{item.name}</p>
          </div>
          <div className="text-right">
            <p className="text-gray-500 text-sm">Estoque Atual</p>
            <p className="text-xl font-bold text-gray-800">{item.current_quantity} <span className="text-sm font-medium">{item.unit}</span></p>
          </div>
        </div>

        <Input
          label="Quantidade"
          type="number"
          min="1"
          step="0.01"
          autoFocus
          value={quantity}
          onChange={(e) => setQuantity(e.target.value === '' ? '' : Number(e.target.value))}
        />

        <Textarea
          label="Motivo (Opcional)"
          placeholder={isInput ? 'Ex: Compra de fornecedor, devolução...' : 'Ex: Uso na costuraria, avaria...'}
          rows={2}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />

        <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-4 pt-6 mt-2 border-t border-gray-100">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto h-14 px-8 rounded-xl text-[18px] font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors focus-ring"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className={`w-full sm:w-auto flex items-center justify-center gap-2 h-14 px-8 rounded-xl text-[18px] font-bold text-white transition-colors shadow-md focus-ring disabled:opacity-70 ${buttonColor}`}
          >
            {isSubmitting ? (
              <Loader2 size={24} className="animate-spin" />
            ) : (
              <>
                <Icon size={24} />
                Confirmar
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>
  )
}
