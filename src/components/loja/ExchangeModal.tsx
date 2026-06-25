import { useState, useEffect } from 'react'
import { Loader2, ArrowRightLeft, Package, ArrowRight } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { SearchableSelect } from '@/components/ui/SearchableSelect'
import { supabase } from '@/lib/supabaseClient'
import { toast } from 'sonner'
import type { Sale, InventoryItem, SaleItem } from '@/types/database'
import { useAuth } from '@/contexts/AuthContext'

interface ExchangeModalProps {
  isOpen: boolean
  sale: Sale | null
  onClose: () => void
  onSuccess: () => void
}

export function ExchangeModal({ isOpen, sale, onClose, onSuccess }: ExchangeModalProps) {
  const { profile, user } = useAuth()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([])

  // Item a devolver
  const [selectedReturnIndex, setSelectedReturnIndex] = useState<number | null>(null)
  const [returnQuantity, setReturnQuantity] = useState(1)

  // Novo item
  const [newItemId, setNewItemId] = useState('')
  const [newItemQty, setNewItemQty] = useState(1)
  const [newItemPrice, setNewItemPrice] = useState(0)

  // Motivo
  const [reason, setReason] = useState('')

  // Tela de sucesso
  const [showSuccess, setShowSuccess] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setSelectedReturnIndex(null)
      setReturnQuantity(1)
      setNewItemId('')
      setNewItemQty(1)
      setNewItemPrice(0)
      setReason('')
      setShowSuccess(false)

      supabase
        .from('inventory_items')
        .select('*')
        .order('name')
        .then(({ data }) => setInventoryItems(data || []))
    }
  }, [isOpen])

  // Atualizar preço ao selecionar novo item
  useEffect(() => {
    if (newItemId) {
      const item = inventoryItems.find(i => i.id === newItemId)
      if (item) {
        setNewItemPrice(item.base_price || 0)
      }
    }
  }, [newItemId, inventoryItems])

  if (!sale) return null

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)

  const selectedReturnItem: SaleItem | null = selectedReturnIndex !== null ? sale.items[selectedReturnIndex] : null
  const returnTotal = selectedReturnItem ? selectedReturnItem.unit_price * returnQuantity : 0
  const newTotal = newItemPrice * newItemQty
  const priceDifference = newTotal - returnTotal

  const newItem = inventoryItems.find(i => i.id === newItemId)

  async function handleConfirmExchange() {
    if (selectedReturnIndex === null || !selectedReturnItem) {
      return toast.error('Selecione o item que será devolvido.')
    }
    if (!newItemId || !newItem) {
      return toast.error('Selecione o novo produto para a troca.')
    }
    if (returnQuantity <= 0) {
      return toast.error('A quantidade devolvida deve ser maior que zero.')
    }
    if (returnQuantity > selectedReturnItem.quantity) {
      return toast.error(`Quantidade máxima para devolução: ${selectedReturnItem.quantity}`)
    }
    if (newItemQty <= 0) {
      return toast.error('A quantidade do novo item deve ser maior que zero.')
    }
    if (newItemQty > newItem.current_quantity) {
      return toast.warning(`Atenção: Estoque insuficiente para "${newItem.name}" (${newItem.current_quantity} disponível).`)
    }

    setIsSubmitting(true)
    try {
      // 1. Registrar a troca na tabela exchanges
      const { error: exchangeError } = await supabase
        .from('exchanges')
        .insert([{
          sale_id: sale.id,
          returned_item_id: selectedReturnItem.id,
          returned_item_name: selectedReturnItem.name,
          returned_quantity: returnQuantity,
          new_item_id: newItem.id,
          new_item_name: newItem.name,
          new_quantity: newItemQty,
          price_difference: priceDifference,
          reason: reason || null,
          created_by: profile?.id || user?.id,
        }])

      if (exchangeError) throw exchangeError

      // 2. Movimento de ENTRADA no estoque (item devolvido volta)
      const { error: entryError } = await supabase
        .from('inventory_movements')
        .insert([{
          item_id: selectedReturnItem.id,
          type: 'entrada',
          quantity: returnQuantity,
          reason: `Troca - Devolução de "${selectedReturnItem.name}" (Venda original)`,
          created_by: profile?.id || user?.id,
        }])

      if (entryError) throw entryError

      // 3. Movimento de SAÍDA no estoque (novo item entregue)
      const { error: exitError } = await supabase
        .from('inventory_movements')
        .insert([{
          item_id: newItem.id,
          type: 'saida',
          quantity: newItemQty,
          reason: `Troca - Entrega de "${newItem.name}" em substituição a "${selectedReturnItem.name}"`,
          created_by: profile?.id || user?.id,
        }])

      if (exitError) throw exitError

      toast.success('Troca registrada com sucesso!')
      setShowSuccess(true)
    } catch (error) {
      console.error('Erro ao registrar troca:', error)
      toast.error('Ocorreu um erro ao registrar a troca.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleFinish = () => {
    onSuccess()
    onClose()
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={showSuccess ? handleFinish : onClose}
      title={showSuccess ? 'Troca Registrada' : 'Registrar Troca'}
      maxWidth="max-w-3xl"
    >
      {showSuccess ? (
        <div className="flex flex-col items-center justify-center py-10 text-center space-y-6">
          <div className="w-20 h-20 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shadow-inner animate-bounce">
            <ArrowRightLeft size={40} />
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-black text-gray-900">Troca Registrada!</h2>
            <p className="text-gray-500 text-base max-w-md">
              O item devolvido foi reintegrado ao estoque e o novo item foi dado baixa automaticamente.
            </p>
          </div>

          <div className="bg-purple-50 p-6 rounded-2xl border border-purple-100 w-full max-w-md text-left space-y-3">
            <div className="flex justify-between text-base text-gray-600">
              <span>Devolvido:</span>
              <span className="font-bold text-gray-900">
                {returnQuantity}x {selectedReturnItem?.name}
              </span>
            </div>
            <div className="flex justify-between text-base text-gray-600">
              <span>Novo item:</span>
              <span className="font-bold text-gray-900">
                {newItemQty}x {newItem?.name}
              </span>
            </div>
            {priceDifference !== 0 && (
              <div className={`flex justify-between text-[16px] font-black pt-2 border-t border-purple-200 ${priceDifference > 0 ? 'text-amber-700' : 'text-emerald-700'}`}>
                <span>{priceDifference > 0 ? 'Cliente paga a mais:' : 'Devolver ao cliente:'}</span>
                <span>{formatCurrency(Math.abs(priceDifference))}</span>
              </div>
            )}
          </div>

          <button
            onClick={handleFinish}
            className="flex items-center justify-center gap-2 h-14 px-10 rounded-xl text-lg font-bold text-white bg-purple-900 hover:bg-purple-800 transition-colors cursor-pointer shadow-md focus-ring"
          >
            Concluir
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Informações da venda original */}
          <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
            <p className="text-sm text-gray-500 mb-1">Venda original</p>
            <p className="font-bold text-gray-900">
              {sale.client?.name || sale.client_name_free || 'Cliente não identificado'}
              <span className="text-gray-500 font-normal ml-2">• {formatCurrency(sale.total || 0)}</span>
            </p>
          </div>

          {/* 1. Selecionar item a devolver */}
          <div>
            <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
              <Package size={20} className="text-red-500" />
              Item a ser devolvido
            </h3>
            <div className="space-y-2">
              {sale.items.map((item, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => {
                    setSelectedReturnIndex(index)
                    setReturnQuantity(1)
                  }}
                  className={[
                    'w-full flex items-center justify-between p-4 rounded-xl border-2 transition-all text-left',
                    selectedReturnIndex === index
                      ? 'bg-red-50 border-red-400 shadow-sm'
                      : 'bg-white border-gray-200 hover:bg-gray-50',
                  ].join(' ')}
                >
                  <div>
                    <p className={`font-bold text-[16px] ${selectedReturnIndex === index ? 'text-red-900' : 'text-gray-900'}`}>
                      {item.name}
                    </p>
                    <p className="text-gray-500 text-sm">
                      {item.quantity} un x {formatCurrency(item.unit_price)}
                    </p>
                  </div>
                  <span className={`font-bold text-lg ${selectedReturnIndex === index ? 'text-red-700' : 'text-gray-700'}`}>
                    {formatCurrency(item.total)}
                  </span>
                </button>
              ))}
            </div>

            {selectedReturnItem && (
              <div className="mt-3 flex items-center gap-4">
                <Input
                  label="Qtd a devolver"
                  type="number"
                  min={1}
                  max={selectedReturnItem.quantity}
                  value={returnQuantity}
                  onChange={e => setReturnQuantity(Math.min(parseInt(e.target.value) || 1, selectedReturnItem.quantity))}
                  className="w-32"
                />
                <p className="text-sm text-gray-500 mt-6">de {selectedReturnItem.quantity} comprado(s)</p>
              </div>
            )}
          </div>

          {/* Seta visual */}
          {selectedReturnItem && (
            <div className="flex justify-center">
              <div className="w-10 h-10 rounded-full bg-purple-100 text-purple-900 flex items-center justify-center">
                <ArrowRight size={20} />
              </div>
            </div>
          )}

          {/* 2. Selecionar novo item */}
          {selectedReturnItem && (
            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
                <Package size={20} className="text-emerald-500" />
                Novo item (troca)
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                <div className="md:col-span-5">
                  <SearchableSelect
                    label="Produto do Estoque"
                    value={newItemId}
                    onChange={val => setNewItemId(val)}
                    options={inventoryItems.map(i => ({
                      value: i.id,
                      label: `${i.name} (${i.current_quantity} ${i.unit})`
                    }))}
                  />
                </div>
                <div className="md:col-span-3">
                  <Input
                    label="Qtd"
                    type="number"
                    min={1}
                    value={newItemQty}
                    onChange={e => setNewItemQty(parseInt(e.target.value) || 1)}
                  />
                </div>
                <div className="md:col-span-4">
                  <Input
                    label="Preço Unit."
                    type="number"
                    step="0.01"
                    min={0}
                    prefixNode={<span className="font-bold text-gray-600">R$</span>}
                    value={newItemPrice}
                    onChange={e => setNewItemPrice(parseFloat(e.target.value) || 0)}
                  />
                </div>
              </div>
            </div>
          )}

          {/* 3. Motivo */}
          {selectedReturnItem && (
            <Textarea
              label="Motivo da Troca"
              placeholder="Ex: Tamanho errado, defeito no produto, cliente não gostou..."
              value={reason}
              onChange={e => setReason(e.target.value)}
            />
          )}

          {/* 4. Resumo da troca */}
          {selectedReturnItem && newItemId && (
            <div className="bg-purple-900 text-white p-5 rounded-2xl space-y-3">
              <h4 className="font-bold text-lg">Resumo da Troca</h4>
              <div className="flex justify-between text-purple-200">
                <span>Devolução ({returnQuantity}x {selectedReturnItem.name}):</span>
                <span className="font-bold text-white">- {formatCurrency(returnTotal)}</span>
              </div>
              <div className="flex justify-between text-purple-200">
                <span>Novo item ({newItemQty}x {newItem?.name}):</span>
                <span className="font-bold text-white">+ {formatCurrency(newTotal)}</span>
              </div>
              <div className="flex justify-between text-xl font-black border-t border-purple-700 pt-2">
                <span>Diferença:</span>
                <span className={priceDifference > 0 ? 'text-amber-300' : priceDifference < 0 ? 'text-emerald-300' : ''}>
                  {priceDifference === 0 ? 'Sem diferença' : (
                    priceDifference > 0
                      ? `Cliente paga ${formatCurrency(priceDifference)}`
                      : `Devolver ${formatCurrency(Math.abs(priceDifference))} ao cliente`
                  )}
                </span>
              </div>
            </div>
          )}

          {/* Botões */}
          <div className="flex items-center justify-end gap-4 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="h-14 px-8 rounded-xl text-[18px] font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={isSubmitting || selectedReturnIndex === null || !newItemId}
              onClick={handleConfirmExchange}
              className="flex items-center justify-center gap-2 h-14 px-10 rounded-xl text-[18px] font-bold text-white bg-purple-900 hover:bg-purple-800 transition-colors shadow-lg disabled:opacity-50 focus-ring"
            >
              {isSubmitting ? <Loader2 size={24} className="animate-spin" /> : (
                <>
                  <ArrowRightLeft size={22} />
                  Confirmar Troca
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </Modal>
  )
}
