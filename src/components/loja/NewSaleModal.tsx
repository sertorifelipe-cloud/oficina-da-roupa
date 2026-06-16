import { useState, useEffect, useRef } from 'react'
import { Loader2, Search, User, Plus, Trash2, Banknote, Receipt, Wallet, CreditCard, ArrowRight, ArrowLeft } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { SearchableSelect } from '@/components/ui/SearchableSelect'
import { supabase } from '@/lib/supabaseClient'
import { toast } from 'sonner'
import type { Client, InventoryItem, PaymentMethod } from '@/types/database'
import { useAuth } from '@/contexts/AuthContext'

interface NewSaleModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

interface CartItem {
  id: string
  name: string
  quantity: number
  unit_price: number
  total: number
}

const paymentMethods: { id: PaymentMethod, label: string, icon: any }[] = [
  { id: 'dinheiro', label: 'Dinheiro', icon: Banknote },
  { id: 'pix', label: 'Pix', icon: Receipt },
  { id: 'cartao_debito', label: 'Débito', icon: Wallet },
  { id: 'cartao_credito', label: 'Crédito', icon: CreditCard },
]

export function NewSaleModal({ isOpen, onClose, onSuccess }: NewSaleModalProps) {
  const { profile } = useAuth()
  const [step, setStep] = useState<1 | 2>(1)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Cliente
  const [isClientFreeText, setIsClientFreeText] = useState(false)
  const [clientNameFree, setClientNameFree] = useState('')
  const [clientSearch, setClientSearch] = useState('')
  const [clientResults, setClientResults] = useState<Client[]>([])
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [isSearchingClient, setIsSearchingClient] = useState(false)
  const [showClientDropdown, setShowClientDropdown] = useState(false)
  const clientDropdownRef = useRef<HTMLDivElement>(null)

  // Estoque (Produtos)
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([])
  
  // Carrinho
  const [cart, setCart] = useState<CartItem[]>([])
  const [currentItemId, setCurrentItemId] = useState('')
  const [currentQty, setCurrentQty] = useState(1)
  const [currentPrice, setCurrentPrice] = useState(0)
  
  // Pagamento
  const [discount, setDiscount] = useState(0)
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null)
  const [notes, setNotes] = useState('')

  useEffect(() => {
    if (isOpen) {
      setStep(1)
      setIsClientFreeText(false)
      setClientNameFree('')
      setClientSearch('')
      setSelectedClient(null)
      setCart([])
      setCurrentItemId('')
      setCurrentQty(1)
      setCurrentPrice(0)
      setDiscount(0)
      setPaymentMethod(null)
      setNotes('')

      supabase
        .from('inventory_items')
        .select('*')
        .order('name')
        .then(({ data }) => setInventoryItems(data || []))
    }
  }, [isOpen])

  // Busca de clientes
  useEffect(() => {
    if (clientSearch.length < 3 || selectedClient?.name === clientSearch) {
      setClientResults([])
      setShowClientDropdown(false)
      return
    }
    const search = async () => {
      setIsSearchingClient(true)
      const { data } = await supabase
        .from('clients')
        .select('*')
        .or(`name.ilike.%${clientSearch}%,phone.ilike.%${clientSearch}%`)
        .limit(5)
      setClientResults(data || [])
      setShowClientDropdown(true)
      setIsSearchingClient(false)
    }
    const debounce = setTimeout(search, 300)
    return () => clearTimeout(debounce)
  }, [clientSearch, selectedClient])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (clientDropdownRef.current && !clientDropdownRef.current.contains(event.target as Node)) {
        setShowClientDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Efeito ao selecionar item do estoque para preencher preço
  useEffect(() => {
    if (currentItemId) {
      const item = inventoryItems.find(i => i.id === currentItemId)
      if (item) {
        setCurrentPrice(item.base_price || 0)
      }
    }
  }, [currentItemId, inventoryItems])

  const selectClient = (client: Client) => {
    setSelectedClient(client)
    setClientSearch(client.name)
    setShowClientDropdown(false)
  }

  const handleAddToCart = () => {
    if (!currentItemId) return toast.error('Selecione um item para adicionar.')
    if (currentQty <= 0) return toast.error('A quantidade deve ser maior que zero.')
    if (currentPrice < 0) return toast.error('O preço não pode ser negativo.')

    const item = inventoryItems.find(i => i.id === currentItemId)
    if (!item) return

    if (currentQty > item.current_quantity) {
      toast.warning(`Atenção: Estoque insuficiente (${item.current_quantity} disponível).`)
    }

    const newItem: CartItem = {
      id: item.id,
      name: item.name,
      quantity: currentQty,
      unit_price: currentPrice,
      total: currentQty * currentPrice
    }

    setCart([...cart, newItem])
    setCurrentItemId('')
    setCurrentQty(1)
    setCurrentPrice(0)
  }

  const handleRemoveFromCart = (index: number) => {
    setCart(cart.filter((_, i) => i !== index))
  }

  const subtotal = cart.reduce((acc, item) => acc + item.total, 0)
  const total = Math.max(0, subtotal - discount)

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)

  const handleNextStep = () => {
    if (!isClientFreeText && !selectedClient) {
      return toast.error('Selecione um cliente ou marque "Venda sem cadastro".')
    }
    if (isClientFreeText && !clientNameFree.trim()) {
      return toast.error('Informe o nome do cliente avulso.')
    }
    if (cart.length === 0) {
      return toast.error('Adicione pelo menos um item à venda.')
    }
    setStep(2)
  }

  const handleConfirmSale = async () => {
    if (!paymentMethod) return toast.error('Selecione uma forma de pagamento.')

    setIsSubmitting(true)
    try {
      const saleData = {
        client_id: isClientFreeText ? null : selectedClient?.id,
        client_name_free: isClientFreeText ? clientNameFree : null,
        created_by: profile?.id,
        items: cart, // JSONB
        subtotal,
        discount,
        total,
        payment_method: paymentMethod,
        notes: notes || null
      }

      const { error } = await supabase.from('sales').insert([saleData]).select().single()
      if (error) throw error

      // 2. Registrar baixas no estoque para cada item
      const movements = cart.map(item => ({
        item_id: item.id,
        type: 'saida' as const,
        quantity: item.quantity,
        reason: `Venda na Loja - Cliente: ${isClientFreeText ? clientNameFree : selectedClient?.name}`,
        created_by: profile?.id
      }))

      const { error: movError } = await supabase.from('inventory_movements').insert(movements)
      if (movError) throw movError

      toast.success(`Venda registrada! Total: ${formatCurrency(total)}`)
      onSuccess()
    } catch (error) {
      console.error('Erro ao registrar venda:', error)
      toast.error('Ocorreu um erro ao registrar a venda.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Nova Venda" maxWidth="max-w-4xl">
      {/* Indicador de Progresso */}
      <div className="flex items-center justify-center gap-8 mb-8">
        <div className={`flex items-center gap-2 text-lg font-bold ${step === 1 ? 'text-purple-900' : 'text-gray-400'}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step === 1 ? 'bg-purple-900 text-white' : 'bg-gray-200 text-gray-500'}`}>1</div>
          Itens da Venda
        </div>
        <div className="w-16 h-1 bg-gray-200 rounded-full" />
        <div className={`flex items-center gap-2 text-lg font-bold ${step === 2 ? 'text-purple-900' : 'text-gray-400'}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step === 2 ? 'bg-purple-900 text-white' : 'bg-gray-200 text-gray-500'}`}>2</div>
          Pagamento
        </div>
      </div>

      {step === 1 ? (
        <div className="space-y-8">
          {/* Seção de Cliente */}
          <div className="bg-gray-50 p-6 rounded-xl border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900">Cliente</h3>
              <label className="flex items-center gap-2 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={isClientFreeText}
                  onChange={(e) => setIsClientFreeText(e.target.checked)}
                  className="w-5 h-5 rounded text-purple-900 accent-purple-900"
                />
                <span className="text-lg font-medium text-gray-700">Venda sem cadastro</span>
              </label>
            </div>

            {isClientFreeText ? (
              <Input
                label="Nome do cliente (Avulso)"
                placeholder="Ex: João que passou na rua"
                value={clientNameFree}
                onChange={e => setClientNameFree(e.target.value)}
              />
            ) : (
              <div className="relative flex flex-col gap-2 w-full" ref={clientDropdownRef}>
                <label className="text-lg font-semibold text-gray-800">Buscar cliente cadastrado</label>
                <div className="relative flex items-center">
                  <div className="absolute left-4 text-gray-500"><Search size={20} /></div>
                  <input
                    type="text"
                    placeholder="Digite o nome ou telefone (mín. 3 letras)"
                    value={clientSearch}
                    onChange={(e) => {
                      setClientSearch(e.target.value)
                      if (selectedClient) setSelectedClient(null)
                    }}
                    className="w-full h-14 pl-12 pr-4 rounded-xl border border-gray-300 text-lg text-gray-900 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-900 focus:border-transparent"
                  />
                  {isSearchingClient && <div className="absolute right-4 text-purple-900"><Loader2 size={20} className="animate-spin" /></div>}
                </div>
                
                {showClientDropdown && clientResults.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-50 overflow-hidden">
                    {clientResults.map(c => (
                      <button
                        key={c.id} type="button" onClick={() => selectClient(c)}
                        className="w-full text-left px-4 py-3 hover:bg-purple-50 flex items-center gap-3 border-b border-gray-100 last:border-0"
                      >
                        <div className="bg-purple-100 p-2 rounded-full text-purple-900"><User size={20} /></div>
                        <div>
                          <p className="font-bold text-gray-900 text-[16px]">{c.name}</p>
                          {c.phone && <p className="text-gray-500 text-sm">{c.phone}</p>}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Adicionar Itens */}
          <div className="bg-white p-6 rounded-xl border border-purple-100 shadow-sm">
            <h3 className="text-xl font-bold text-purple-900 mb-4">Adicionar Item</h3>
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
              <div className="md:col-span-5">
                <SearchableSelect
                  label="Produto (Estoque)"
                  value={currentItemId}
                  onChange={val => setCurrentItemId(val)}
                  options={inventoryItems.map(i => ({ 
                    value: i.id, 
                    label: `${i.name} (${i.current_quantity} ${i.unit})` 
                  }))}
                />
              </div>
              <div className="md:col-span-2">
                <Input
                  label="Qtd"
                  type="number"
                  min="1"
                  value={currentQty}
                  onChange={e => setCurrentQty(parseInt(e.target.value) || 0)}
                />
              </div>
              <div className="md:col-span-3">
                <Input
                  label="Preço Unit."
                  type="number"
                  step="0.01"
                  min="0"
                  prefixNode={<span className="font-bold text-gray-600">R$</span>}
                  value={currentPrice}
                  onChange={e => setCurrentPrice(parseFloat(e.target.value) || 0)}
                />
              </div>
              <div className="md:col-span-2">
                <button
                  onClick={handleAddToCart}
                  className="w-full h-14 flex items-center justify-center gap-2 rounded-xl text-[16px] font-bold text-white bg-purple-600 hover:bg-purple-700 transition-colors focus-ring"
                >
                  <Plus size={20} /> Add
                </button>
              </div>
            </div>
          </div>

          {/* Carrinho */}
          <div>
            <h3 className="text-xl font-bold text-gray-900 mb-4">Itens da Venda</h3>
            {cart.length === 0 ? (
              <p className="text-gray-500 text-lg italic text-center py-6 bg-gray-50 rounded-xl">
                Nenhum item adicionado ainda.
              </p>
            ) : (
              <div className="space-y-3">
                {cart.map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-200">
                    <div>
                      <p className="font-bold text-gray-900 text-[18px]">{item.name}</p>
                      <p className="text-gray-500 text-[16px]">
                        {item.quantity} un x {formatCurrency(item.unit_price)}
                      </p>
                    </div>
                    <div className="flex items-center gap-6">
                      <p className="font-bold text-purple-900 text-[18px]">
                        {formatCurrency(item.total)}
                      </p>
                      <button
                        onClick={() => handleRemoveFromCart(index)}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        title="Remover"
                      >
                        <Trash2 size={24} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between pt-6 border-t border-gray-200">
            <div>
              <p className="text-gray-500 text-lg">Subtotal</p>
              <p className="text-3xl font-bold text-gray-900">{formatCurrency(subtotal)}</p>
            </div>
            <button
              onClick={handleNextStep}
              className="flex items-center justify-center gap-2 h-[60px] px-8 rounded-xl text-[20px] font-bold text-white bg-purple-900 hover:bg-purple-800 transition-colors shadow-lg focus-ring"
            >
              Próximo Passo
              <ArrowRight size={24} />
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Valores Totais */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-purple-50 p-6 rounded-2xl border border-purple-100">
            <div>
              <p className="text-purple-700 text-lg mb-1">Subtotal da Venda</p>
              <p className="text-2xl font-bold text-purple-900">{formatCurrency(subtotal)}</p>
              
              <div className="mt-4">
                <Input
                  label="Desconto R$ (Opcional)"
                  type="number"
                  step="0.01"
                  min="0"
                  max={subtotal}
                  value={discount}
                  onChange={e => setDiscount(parseFloat(e.target.value) || 0)}
                  className="bg-white"
                />
              </div>
            </div>
            <div className="flex flex-col justify-end text-right">
              <p className="text-purple-700 text-xl mb-1">Total a Pagar</p>
              <p className="text-5xl font-black text-purple-900">{formatCurrency(total)}</p>
            </div>
          </div>

          {/* Formas de Pagamento */}
          <div>
            <h3 className="text-xl font-bold text-gray-900 mb-4">Como o cliente vai pagar?</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {paymentMethods.map(method => {
                const Icon = method.icon
                const isSelected = paymentMethod === method.id
                return (
                  <button
                    key={method.id}
                    onClick={() => setPaymentMethod(method.id)}
                    className={`flex flex-col items-center justify-center gap-3 p-6 rounded-2xl border-2 transition-all focus-ring ${
                      isSelected 
                        ? 'bg-purple-900 border-purple-900 text-white shadow-lg scale-105'
                        : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <Icon size={32} />
                    <span className="text-[18px] font-bold">{method.label}</span>
                  </button>
                )
              })}
            </div>
          </div>

          <Textarea
            label="Observações da Venda (Opcional)"
            placeholder="Algum detalhe a registrar sobre o pagamento ou a venda?"
            value={notes}
            onChange={e => setNotes(e.target.value)}
          />

          <div className="flex items-center justify-between pt-6 border-t border-gray-200">
            <button
              onClick={() => setStep(1)}
              className="flex items-center justify-center gap-2 h-[60px] px-8 rounded-xl text-[20px] font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors focus-ring"
            >
              <ArrowLeft size={24} />
              Voltar
            </button>
            <button
              onClick={handleConfirmSale}
              disabled={isSubmitting}
              className="flex items-center justify-center gap-2 h-[60px] px-10 rounded-xl text-[22px] font-bold text-white bg-[#16a34a] hover:bg-[#15803d] transition-colors shadow-xl focus-ring disabled:opacity-70"
            >
              {isSubmitting ? <Loader2 size={28} className="animate-spin" /> : '✓ Confirmar Venda'}
            </button>
          </div>
        </div>
      )}
    </Modal>
  )
}
