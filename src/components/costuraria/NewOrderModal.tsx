import { useState, useEffect, useRef } from 'react'
import { useForm, useFieldArray, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2, Search, User, Plus, Trash2, Scissors, Printer } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { SearchableSelect } from '@/components/ui/SearchableSelect'
import { supabase } from '@/lib/supabaseClient'
import { toast } from 'sonner'
import type { Client, Service, Order } from '@/types/database'
import { useAuth } from '@/contexts/AuthContext'
import { printOrderInvoice } from '@/lib/printHelper'

interface NewOrderModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

const serviceItemSchema = z.object({
  service_id: z.string().min(1, 'Selecione o serviço.'),
  description: z.string().min(1, 'Descreva o serviço.'),
  price: z.number().min(0, 'Valor inválido.')
})

const orderSchema = z.object({
  client_id: z.string().min(1, 'Por favor, selecione um cliente.'),
  services_items: z.array(serviceItemSchema).min(1, 'Adicione pelo menos um serviço.'),
  expected_date: z.string().min(1, 'Informe a data de entrega prevista.'),
  amount_paid: z.number().min(0, 'Valor de entrada inválido.'),
  payment_method: z.string().optional(),
  notes: z.string().optional()
}).refine(data => {
  const total = data.services_items.reduce((acc, item) => acc + (item.price || 0), 0);
  return (data.amount_paid || 0) <= total;
}, {
  message: 'O valor de entrada não pode ser maior que o valor total do pedido.',
  path: ['amount_paid']
}).refine(data => {
  if (data.amount_paid > 0 && !data.payment_method) {
    return false;
  }
  return true;
}, {
  message: 'Selecione o meio de pagamento da entrada.',
  path: ['payment_method']
})

type OrderForm = z.infer<typeof orderSchema>

export function NewOrderModal({ isOpen, onClose, onSuccess }: NewOrderModalProps) {
  const { profile, user } = useAuth()
  const [services, setServices] = useState<Service[]>([])
  
  // Autocomplete de Clientes
  const [clientSearch, setClientSearch] = useState('')
  const [clientResults, setClientResults] = useState<Client[]>([])
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)

  const [showClientDropdown, setShowClientDropdown] = useState(false)
  const [showSuccessScreen, setShowSuccessScreen] = useState(false)
  const [insertedOrderData, setInsertedOrderData] = useState<Order | null>(null)
  
  // Cadastro Rápido de Cliente
  const [isCreatingClient, setIsCreatingClient] = useState(false)
  const [newClientName, setNewClientName] = useState('')
  const [newClientPhone, setNewClientPhone] = useState('')
  const [isSubmittingClient, setIsSubmittingClient] = useState(false)

  // Cadastro Rápido de Serviço
  const [isCreatingService, setIsCreatingService] = useState(false)
  const [newServiceName, setNewServiceName] = useState('')
  const [newServicePrice, setNewServicePrice] = useState(0)
  const [isSubmittingService, setIsSubmittingService] = useState(false)
  
  const dropdownRef = useRef<HTMLDivElement>(null)

  const {
    register,
    handleSubmit,
    control,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting }
  } = useForm<OrderForm>({
    resolver: zodResolver(orderSchema),
    defaultValues: {
      services_items: [{ service_id: '', description: '', price: 0 }],
      amount_paid: 0,
      payment_method: ''
    }
  })

  const watchedAmountPaid = watch('amount_paid')

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'services_items'
  })

  const watchedItems = watch('services_items')
  const totalAmount = watchedItems.reduce((acc, item) => acc + (item.price || 0), 0)

  // Carregar serviços
  useEffect(() => {
    if (isOpen) {
      supabase
        .from('services')
        .select('*')
        .eq('category', 'costuraria')
        .eq('active', true)
        .order('name')
        .then(({ data }) => setServices(data || []))
    } else {
      reset()
      setClientSearch('')
      setSelectedClient(null)
      setClientResults([])
      setShowSuccessScreen(false)
      setInsertedOrderData(null)
      setIsCreatingClient(false)
      setNewClientName('')
      setNewClientPhone('')
      setIsCreatingService(false)
      setNewServiceName('')
      setNewServicePrice(0)
    }
  }, [isOpen, reset])

  // Busca de clientes (Autocomplete)
  useEffect(() => {
    if (clientSearch.length < 3 || selectedClient?.name === clientSearch) {
      setClientResults([])
      setShowClientDropdown(false)
      return
    }

    const search = async () => {
      const { data } = await supabase
        .from('clients')
        .select('*')
        .or(`name.ilike.%${clientSearch}%,phone.ilike.%${clientSearch}%`)
        .limit(5)
      
      setClientResults(data || [])
      setShowClientDropdown(true)
    }

    const debounce = setTimeout(search, 300)
    return () => clearTimeout(debounce)
  }, [clientSearch, selectedClient])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowClientDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const selectClient = (client: Client) => {
    setSelectedClient(client)
    setClientSearch(client.name)
    setValue('client_id', client.id)
    setShowClientDropdown(false)
  }

  const handleCreateClient = async () => {
    if (!newClientName.trim()) return toast.error('Informe o nome do cliente.')
    setIsSubmittingClient(true)
    try {
      const { data, error } = await supabase
        .from('clients')
        .insert([{ name: newClientName, phone: newClientPhone || null }])
        .select('*')
        .single()
      
      if (error) throw error
      
      toast.success('Cliente cadastrado com sucesso!')
      selectClient(data)
      setIsCreatingClient(false)
      setNewClientName('')
      setNewClientPhone('')
    } catch (err) {
      console.error('Erro ao cadastrar cliente:', err)
      toast.error('Ocorreu um erro ao cadastrar o cliente.')
    } finally {
      setIsSubmittingClient(false)
    }
  }

  const handleCreateService = async () => {
    if (!newServiceName.trim()) return toast.error('Informe o nome do serviço.')
    setIsSubmittingService(true)
    try {
      const { data, error } = await supabase
        .from('services')
        .insert([{
          name: newServiceName,
          base_price: newServicePrice,
          category: 'costuraria',
          active: true
        }])
        .select('*')
        .single()
      
      if (error) throw error
      
      toast.success('Serviço cadastrado com sucesso!')
      
      // Adicionar à lista de serviços disponíveis
      setServices(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)))
      
      setIsCreatingService(false)
      setNewServiceName('')
      setNewServicePrice(0)
    } catch (err) {
      console.error('Erro ao cadastrar serviço:', err)
      toast.error('Ocorreu um erro ao cadastrar o serviço.')
    } finally {
      setIsSubmittingService(false)
    }
  }

  const handleServiceChange = (index: number, serviceId: string) => {
    const service = services.find(s => s.id === serviceId)
    if (service) {
      setValue(`services_items.${index}.price`, service.base_price || 0)
      // Se a descrição estiver vazia, preenche com o nome do serviço
      const currentDesc = watchedItems[index].description
      if (!currentDesc) {
        setValue(`services_items.${index}.description`, service.name)
      }
    }
  }

  async function onSubmit(data: OrderForm) {
    try {
      const mainDescription = data.services_items.map(item => item.description).join(', ')
      
      const { data: insertedOrder, error } = await supabase
        .from('orders')
        .insert([{
          client_id: data.client_id,
          service_id: data.services_items[0].service_id, // Mantido para compatibilidade simples
          description: mainDescription,
          services_items: data.services_items,
          expected_date: data.expected_date,
          price: totalAmount,
          amount_paid: data.amount_paid || 0,
          payment_method: data.amount_paid > 0 ? data.payment_method : null,
          notes: data.notes || null,
          created_by: profile?.id || user?.id,
          status: 'recebido'
        }])
        .select('*, client:clients(*)')
        .single()

      if (error) throw error

      toast.success(`Pedido criado com sucesso! Comanda #${String(insertedOrder.order_number).padStart(4, '0')}`)
      setInsertedOrderData(insertedOrder as Order)
      setShowSuccessScreen(true)
    } catch (err: any) {
      console.error('Erro ao criar pedido:', err)
      toast.error('Ocorreu um erro ao salvar o pedido.')
    }
  }

  const formatCurrencySafe = (val: any) => {
    if (val === null || val === undefined) return 'R$ 0,00'
    const parsed = typeof val === 'string' ? parseFloat(val) : val
    if (isNaN(parsed)) return 'R$ 0,00'
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(parsed)
  }

  const formatDateSafe = (dateStr: any) => {
    if (!dateStr) return '-'
    try {
      const dateStrClean = String(dateStr)
      const date = new Date(dateStrClean.includes('T') ? dateStrClean : `${dateStrClean}T12:00:00`)
      if (isNaN(date.getTime())) return dateStrClean
      return date.toLocaleDateString('pt-BR')
    } catch (err) {
      console.error('Erro ao formatar data no modal de sucesso:', err)
      return String(dateStr)
    }
  }

  const formFooter = !showSuccessScreen ? (
    <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-4">
      <button
        type="button"
        onClick={onClose}
        className="w-full sm:w-auto h-14 px-8 rounded-xl text-[18px] font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors"
      >
        Cancelar
      </button>
      <button
        type="submit"
        form="new-order-form"
        disabled={isSubmitting}
        className="w-full sm:w-auto flex items-center justify-center gap-2 h-14 px-12 rounded-xl text-[18px] font-bold text-white bg-purple-900 hover:bg-purple-800 transition-colors shadow-lg disabled:opacity-70"
      >
        {isSubmitting ? <Loader2 size={24} className="animate-spin" /> : 'Finalizar Pedido'}
      </button>
    </div>
  ) : undefined

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={showSuccessScreen ? onSuccess : onClose} 
      title={showSuccessScreen ? "Pedido Cadastrado" : "Novo Pedido de Costuraria"} 
      maxWidth="max-w-4xl"
      footer={formFooter}
    >
      {showSuccessScreen ? (
        <div className="flex flex-col items-center justify-center py-10 text-center space-y-6">
          <div className="w-20 h-20 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shadow-inner animate-bounce">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-10 h-10">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
          </div>
          
          <div className="space-y-2">
            <h2 className="text-2xl font-black text-gray-900">Pedido Cadastrado com Sucesso!</h2>
            <p className="text-gray-500 text-base max-w-md">
              O pedido de costuraria foi registrado e a comanda foi gerada.
            </p>
          </div>

          {insertedOrderData && (
            <div className="bg-purple-50 p-6 rounded-2xl border border-purple-100 w-full max-w-md text-left space-y-3">
              <div className="flex justify-between text-base text-gray-600">
                <span>Comanda:</span>
                <span className="font-bold text-gray-900">
                  #{String(insertedOrderData.order_number || '').padStart(4, '0')}
                </span>
              </div>
              <div className="flex justify-between text-base text-gray-600">
                <span>Cliente:</span>
                <span className="font-bold text-gray-900">
                  {insertedOrderData.client?.name || 'Não informado'}
                </span>
              </div>
              <div className="flex justify-between text-base text-gray-600">
                <span>Previsão de Entrega:</span>
                <span className="font-bold text-gray-900">
                  {formatDateSafe(insertedOrderData.expected_date)}
                </span>
              </div>
              <div className="flex justify-between text-base text-gray-600">
                <span>Total do Pedido:</span>
                <span className="font-bold text-gray-900">
                  {formatCurrencySafe(insertedOrderData.price)}
                </span>
              </div>
              <div className="flex justify-between text-[16px] font-black text-purple-900 pt-2 border-t border-purple-200">
                <span>Valor Entrada:</span>
                <span>
                  {formatCurrencySafe(insertedOrderData.amount_paid)}
                </span>
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md pt-6">
            <button
              onClick={() => insertedOrderData && printOrderInvoice(insertedOrderData)}
              className="flex-1 flex items-center justify-center gap-2 h-14 rounded-xl text-lg font-bold text-purple-900 bg-purple-50 border-2 border-purple-200 hover:bg-purple-100 transition-colors cursor-pointer focus-ring"
            >
              <Printer size={20} />
              Imprimir Comprovante (A4)
            </button>
            <button
              onClick={onSuccess}
              className="flex-1 flex items-center justify-center gap-2 h-14 rounded-xl text-lg font-bold text-white bg-purple-900 hover:bg-purple-800 transition-colors cursor-pointer shadow-md focus-ring"
            >
              Concluir
            </button>
          </div>
        </div>
      ) : (
        <form id="new-order-form" onSubmit={handleSubmit(onSubmit)} className="space-y-2">
        
        {/* 1. Cliente */}
        <div className="relative flex flex-col gap-2 w-full" ref={dropdownRef}>
          <div className="flex justify-between items-center">
            <label className="text-lg font-bold text-gray-900">Cliente</label>
            {!isCreatingClient && (
              <button
                type="button"
                onClick={() => setIsCreatingClient(true)}
                className="text-purple-700 font-bold hover:text-purple-900 text-sm focus-ring underline"
              >
                + Novo Cliente
              </button>
            )}
          </div>
          
          {isCreatingClient ? (
            <div className="bg-white p-4 rounded-xl border border-purple-200 shadow-sm space-y-4">
              <h4 className="text-lg font-bold text-purple-900 flex items-center gap-2">
                <User size={20} /> Cadastrar Novo Cliente
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Nome *"
                  placeholder="Nome completo"
                  value={newClientName}
                  onChange={e => setNewClientName(e.target.value)}
                  disabled={isSubmittingClient}
                />
                <Input
                  label="Telefone"
                  placeholder="(00) 00000-0000"
                  value={newClientPhone}
                  onChange={e => setNewClientPhone(e.target.value)}
                  disabled={isSubmittingClient}
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreatingClient(false)}
                  disabled={isSubmittingClient}
                  className="px-4 py-2 rounded-lg font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleCreateClient}
                  disabled={isSubmittingClient}
                  className="flex items-center gap-2 px-6 py-2 rounded-lg font-bold text-white bg-purple-600 hover:bg-purple-700 transition-colors shadow-md"
                >
                  {isSubmittingClient ? <Loader2 size={18} className="animate-spin" /> : 'Salvar e Selecionar'}
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="relative flex items-center">
                <div className="absolute left-4 text-gray-500">
                  <Search size={20} />
                </div>
                <input
                  type="text"
                  placeholder="Buscar por nome ou telefone..."
                  value={clientSearch}
                  onChange={(e) => {
                    setClientSearch(e.target.value)
                    if (selectedClient) {
                      setSelectedClient(null)
                      setValue('client_id', '')
                    }
                  }}
                  className={[
                    'w-full h-[52px] pl-12 pr-4 rounded-xl border text-lg text-gray-900 bg-white shadow-sm transition-all',
                    'focus:outline-none focus:ring-2 focus:ring-purple-900 focus:border-transparent',
                    errors.client_id ? 'border-red-500 bg-red-50' : 'border-gray-300 hover:border-gray-400',
                  ].join(' ')}
                />
              </div>
              {errors.client_id && <p className="text-sm text-red-600 font-bold">{errors.client_id.message}</p>}
            </>
          )}
          
          {showClientDropdown && clientResults.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-xl z-50 overflow-hidden">
              {clientResults.map(client => (
                <button
                  key={client.id}
                  type="button"
                  onClick={() => selectClient(client)}
                  className="w-full text-left px-4 py-3 hover:bg-purple-50 transition-colors flex items-center gap-3 border-b border-gray-100 last:border-0"
                >
                  <div className="bg-purple-100 p-2 rounded-full text-purple-900"><User size={20} /></div>
                  <div>
                    <p className="font-bold text-gray-900 text-[16px]">{client.name}</p>
                    <p className="text-gray-500 text-sm">{client.phone}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 2. Serviços Multiplos */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <label className="text-lg font-bold text-gray-900">Serviços Solicitados</label>
            <div className="flex flex-col sm:flex-row gap-2">
              {!isCreatingService && (
                <button
                  type="button"
                  onClick={() => setIsCreatingService(true)}
                  className="text-purple-700 font-bold hover:text-purple-900 text-sm focus-ring underline flex items-center justify-center px-2"
                >
                  + Cadastrar Serviço
                </button>
              )}
              <button
                type="button"
                onClick={() => append({ service_id: '', description: '', price: 0 })}
                className="flex items-center justify-center gap-2 px-4 h-[44px] bg-purple-50 text-purple-900 font-bold rounded-xl hover:bg-purple-100 transition-colors"
              >
                <Plus size={20} /> Adicionar Item
              </button>
            </div>
          </div>

          {isCreatingService && (
            <div className="bg-white p-4 rounded-xl border border-purple-200 shadow-sm space-y-4 mb-4">
              <h4 className="text-lg font-bold text-purple-900 flex items-center gap-2">
                <Plus size={20} /> Cadastrar Novo Serviço
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Nome do Serviço *"
                  placeholder="Ex: Troca de Zíper"
                  value={newServiceName}
                  onChange={e => setNewServiceName(e.target.value)}
                  disabled={isSubmittingService}
                />
                <Input
                  label="Preço Base (R$)"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="Ex: 25.00"
                  value={newServicePrice === 0 ? '' : newServicePrice}
                  onChange={e => setNewServicePrice(parseFloat(e.target.value) || 0)}
                  disabled={isSubmittingService}
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreatingService(false)}
                  disabled={isSubmittingService}
                  className="px-4 py-2 rounded-lg font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleCreateService}
                  disabled={isSubmittingService}
                  className="flex items-center gap-2 px-6 py-2 rounded-lg font-bold text-white bg-purple-600 hover:bg-purple-700 transition-colors shadow-md"
                >
                  {isSubmittingService ? <Loader2 size={18} className="animate-spin" /> : 'Salvar Serviço'}
                </button>
              </div>
            </div>
          )}

          <div className="space-y-6">
            {fields.map((field, index) => (
              <div key={field.id} className="p-5 bg-gray-50 rounded-2xl border border-gray-200 space-y-4 relative group">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                  {/* Seleção do Serviço */}
                  <div className="md:col-span-4">
                    <Controller
                      name={`services_items.${index}.service_id`}
                      control={control}
                      render={({ field }) => (
                        <SearchableSelect
                          label="Serviço"
                          options={services.map(s => ({ value: s.id, label: s.name }))}
                          value={field.value}
                          onChange={(val) => {
                            field.onChange(val)
                            handleServiceChange(index, val)
                          }}
                          error={errors.services_items?.[index]?.service_id?.message}
                        />
                      )}
                    />
                  </div>
                  {/* Descrição Curta */}
                  <div className="md:col-span-5">
                    <Input
                      label="O que será feito?"
                      placeholder="Ex: Barra simples, Ajuste cintura..."
                      {...register(`services_items.${index}.description`)}
                      error={errors.services_items?.[index]?.description?.message}
                    />
                  </div>
                  {/* Preço */}
                  <div className="md:col-span-3">
                    <Input
                      label="Valor"
                      type="number"
                      step="0.01"
                      prefixNode={<span className="font-bold text-gray-500">R$</span>}
                      {...register(`services_items.${index}.price`, { valueAsNumber: true })}
                      error={errors.services_items?.[index]?.price?.message}
                    />
                  </div>
                </div>

                {fields.length > 1 && (
                  <button
                    type="button"
                    onClick={() => remove(index)}
                    className="absolute -top-3 -right-3 w-8 h-8 bg-red-100 text-red-600 rounded-full flex items-center justify-center hover:bg-red-600 hover:text-white transition-all shadow-sm"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            ))}
          </div>

          {errors.services_items?.message && (
            <p className="text-sm text-red-600 font-bold">{errors.services_items.message}</p>
          )}
        </div>

        {/* 3. Resumo Financeiro e Datas */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 p-6 bg-purple-900 rounded-2xl text-white">
          <div className="space-y-4">
            <h3 className="text-xl font-bold flex items-center gap-2"><Scissors size={24} /> Resumo do Pedido</h3>
            <div className="space-y-2">
              <div className="flex justify-between text-lg opacity-90">
                <span>Total de itens:</span>
                <span>{fields.length}</span>
              </div>
              <div className="flex justify-between text-2xl font-black border-t border-purple-800 pt-2">
                <span>Total Geral:</span>
                <span>R$ {totalAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <Input
              label="Previsão de Entrega"
              type="date"
              {...register('expected_date')}
              labelClassName="text-white"
              className="bg-white/10 border-white/20 text-white placeholder:text-white/50 h-14"
              error={errors.expected_date?.message}
            />
            <Input
              label="Valor de Entrada (Pago no Ato)"
              type="number"
              step="0.01"
              min="0"
              prefixNode={<span className="font-bold text-gray-500">R$</span>}
              {...register('amount_paid', { valueAsNumber: true })}
              labelClassName="text-white"
              className="bg-white text-gray-900 h-14 font-medium"
              error={errors.amount_paid?.message}
            />
            {watchedAmountPaid > 0 && (
              <div className="flex flex-col gap-2">
                <label className="text-[16px] font-semibold text-white">Forma de Pagamento da Entrada</label>
                <div className="grid grid-cols-2 gap-2">
                  <Controller
                    name="payment_method"
                    control={control}
                    render={({ field }) => (
                      <>
                        {[
                          { id: 'dinheiro', label: 'Dinheiro' },
                          { id: 'pix', label: 'Pix' },
                          { id: 'cartao_debito', label: 'Débito' },
                          { id: 'cartao_credito', label: 'Crédito' },
                        ].map(method => (
                          <label key={method.id} className={`
                            flex items-center justify-center h-12 rounded-xl border-2 cursor-pointer transition-colors text-sm
                            ${field.value === method.id 
                              ? 'bg-purple-900 border-white text-white font-bold' 
                              : 'bg-white border-transparent text-purple-900 hover:bg-purple-50 font-semibold'}
                          `}>
                            <input 
                              type="radio" 
                              value={method.id} 
                              className="sr-only"
                              checked={field.value === method.id}
                              onChange={() => field.onChange(method.id)}
                            />
                            <span>{method.label}</span>
                          </label>
                        ))}
                      </>
                    )}
                  />
                </div>
                {errors.payment_method && <p className="text-sm text-red-300 font-bold">{errors.payment_method.message}</p>}
              </div>
            )}
          </div>
        </div>

        {/* 4. Notas */}
        <Textarea
          label="Observações Gerais (Opcional)"
          placeholder="Ex: Cliente tem pressa, deixar na portaria..."
          rows={1}
          {...register('notes')}
        />

        </form>
      )}
    </Modal>
  )
}
