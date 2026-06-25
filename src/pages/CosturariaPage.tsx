import { useState, useEffect, useCallback } from 'react'
import { Plus, Loader2, Inbox, Search } from 'lucide-react'
import { supabase } from '@/lib/supabaseClient'
import type { Order, OrderStatus } from '@/types/database'
import { OrderCard } from '@/components/costuraria/OrderCard'
import { NewOrderModal } from '@/components/costuraria/NewOrderModal'
import { OrderDetailsModal } from '@/components/costuraria/OrderDetailsModal'
import { toast } from 'sonner'

type FilterStatus = OrderStatus | 'todos'

const filterOptions: { value: FilterStatus; label: string }[] = [
  { value: 'todos', label: 'Todos' },
  { value: 'recebido', label: 'Recebido' },
  { value: 'em_andamento', label: 'Em andamento' },
  { value: 'pronto', label: 'Pronto' },
  { value: 'entregue', label: 'Entregue' },
  { value: 'cancelado', label: 'Cancelado' },
]

export function CosturariaPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeFilter, setActiveFilter] = useState<FilterStatus>('todos')
  
  // Filtros Adicionais
  const [searchQuery, setSearchQuery] = useState('')
  const [paymentFilter, setPaymentFilter] = useState('todos')
  
  // Controle de Modais
  const [isNewOrderModalOpen, setIsNewOrderModalOpen] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)

  // Filtro de pedidos em memória
  const filteredOrders = orders.filter(order => {
    // Busca livre (por nome do cliente ou número da comanda)
    const matchesSearch = searchQuery.trim() === '' || 
      (order.client?.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      String(order.order_number).includes(searchQuery)

    // Filtro por Forma de Pagamento
    const matchesPayment = paymentFilter === 'todos' ||
      order.payment_method === paymentFilter ||
      order.delivery_payment_method === paymentFilter

    return matchesSearch && matchesPayment
  })
  
  const fetchOrders = useCallback(async () => {
    setIsLoading(true)
    try {
      let query = supabase
        .from('orders')
        .select(`
          *,
          client:clients(*),
          service:services(*)
        `)
        .order('created_at', { ascending: false })

      if (activeFilter !== 'todos') {
        query = query.eq('status', activeFilter)
      }

      // Filtrar apenas pedidos de serviços da categoria 'costuraria'
      // O Supabase não suporta inner join filtrado facilmente com o client-side select syntax simples,
      // mas como o serviço já é preenchido, podemos filtrar no JS ou garantir que a tela só veja costuraria.
      // O ideal seria criar uma view ou RPC, mas para simplificar filtramos na listagem.

      const { data, error } = await query

      if (error) throw error

      // Filtra apenas os pedidos que pertecem à costuraria (caso existam pedidos da loja na mesma tabela)
      const costurariaOrders = (data as Order[]).filter(
        o => o.service?.category === 'costuraria' || o.service_id === null
      )

      setOrders(costurariaOrders)
    } catch (error: any) {
      console.error('Erro ao buscar pedidos:', error)
      toast.error('Não foi possível carregar os pedidos.')
    } finally {
      setIsLoading(false)
    }
  }, [activeFilter])

  useEffect(() => {
    fetchOrders()
  }, [fetchOrders])

  const handleOrderCreated = () => {
    setIsNewOrderModalOpen(false)
    fetchOrders()
  }

  const handleOrderUpdated = () => {
    fetchOrders()
    // Opcional: Atualizar o selectedOrder se o modal permanecer aberto,
    // mas o OrderDetailsModal já se fecha após a atualização no nosso design.
  }

  return (
    <div className="space-y-8 pb-10">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Costuraria</h1>
        <button
          onClick={() => setIsNewOrderModalOpen(true)}
          className="flex items-center justify-center gap-2 h-[52px] px-6 rounded-xl text-[18px] font-bold text-white bg-purple-900 hover:bg-purple-800 transition-colors shadow-md focus-ring"
        >
          <Plus size={24} strokeWidth={2.5} />
          Novo pedido
        </button>
      </div>

      {/* Filtros de Status (Pills) e Busca/Pagamentos */}
      <div className="space-y-4">
        <div className="flex flex-wrap gap-3">
          {filterOptions.map(option => (
            <button
              key={option.value}
              onClick={() => setActiveFilter(option.value)}
              className={[
                'h-12 px-6 rounded-full text-[16px] font-bold transition-all focus-ring',
                activeFilter === option.value
                  ? 'bg-purple-900 text-white shadow-md'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              ].join(' ')}
            >
              {option.label}
            </button>
          ))}
        </div>

        {/* Busca e Meios de Pagamento */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-white p-4 rounded-2xl border border-gray-200 shadow-sm">
          <div className="md:col-span-2 relative flex items-center">
            <Search className="absolute left-4 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Buscar cliente ou número da comanda..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-12 pl-12 pr-4 rounded-xl border border-gray-300 text-[16px] text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-900 focus:border-transparent transition-all"
            />
          </div>
          <div className="relative">
            <select
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value)}
              className="w-full h-12 px-4 rounded-xl border border-gray-300 text-[16px] text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-purple-900 focus:border-transparent transition-all appearance-none cursor-pointer"
              style={{
                backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e")`,
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'right 1rem center',
                backgroundSize: '1.2em 1.2em',
                paddingRight: '2.5rem'
              }}
            >
              <option value="todos">Todos os pagamentos</option>
              <option value="dinheiro">Dinheiro</option>
              <option value="pix">Pix</option>
              <option value="cartao_debito">Cartão de Débito</option>
              <option value="cartao_credito">Cartão de Crédito</option>
            </select>
          </div>
        </div>
      </div>

      {/* Lista de Pedidos */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4 text-purple-900">
          <Loader2 size={40} className="animate-spin" />
          <p className="text-lg font-medium">Carregando pedidos...</p>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="flex flex-col items-center justify-center bg-white rounded-2xl border border-gray-200 border-dashed py-20 px-4 text-center">
          <div className="bg-gray-100 p-4 rounded-full text-gray-400 mb-4">
            <Inbox size={48} />
          </div>
          <h3 className="text-xl font-bold text-gray-800 mb-2">Nenhum pedido encontrado</h3>
          <p className="text-gray-500 text-lg max-w-md">
            {orders.length === 0 ? (
              activeFilter === 'todos' 
                ? 'Você ainda não tem nenhum pedido cadastrado. Clique no botão "Novo pedido" para começar.'
                : `Não há pedidos com o status "${filterOptions.find(f => f.value === activeFilter)?.label}".`
            ) : (
              'Nenhum pedido atende aos critérios de busca ou filtros selecionados.'
            )}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredOrders.map(order => (
            <OrderCard 
              key={order.id} 
              order={order} 
              onViewDetails={(o) => setSelectedOrder(o)} 
            />
          ))}
        </div>
      )}

      {/* Modais */}
      <NewOrderModal 
        isOpen={isNewOrderModalOpen}
        onClose={() => setIsNewOrderModalOpen(false)}
        onSuccess={handleOrderCreated}
      />

      <OrderDetailsModal
        isOpen={!!selectedOrder}
        order={selectedOrder}
        onClose={() => setSelectedOrder(null)}
        onUpdate={handleOrderUpdated}
      />
    </div>
  )
}
