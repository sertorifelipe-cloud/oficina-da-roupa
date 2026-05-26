import { useState, useEffect, useCallback } from 'react'
import { Plus, Loader2, Inbox } from 'lucide-react'
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
]

export function CosturariaPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeFilter, setActiveFilter] = useState<FilterStatus>('todos')
  
  // Controle de Modais
  const [isNewOrderModalOpen, setIsNewOrderModalOpen] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  
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

      {/* Filtros (Pills) */}
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

      {/* Lista de Pedidos */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4 text-purple-900">
          <Loader2 size={40} className="animate-spin" />
          <p className="text-lg font-medium">Carregando pedidos...</p>
        </div>
      ) : orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center bg-white rounded-2xl border border-gray-200 border-dashed py-20 px-4 text-center">
          <div className="bg-gray-100 p-4 rounded-full text-gray-400 mb-4">
            <Inbox size={48} />
          </div>
          <h3 className="text-xl font-bold text-gray-800 mb-2">Nenhum pedido encontrado</h3>
          <p className="text-gray-500 text-lg max-w-md">
            {activeFilter === 'todos' 
              ? 'Você ainda não tem nenhum pedido cadastrado. Clique no botão "Novo pedido" para começar.'
              : `Não há pedidos com o status "${filterOptions.find(f => f.value === activeFilter)?.label}".`}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {orders.map(order => (
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
