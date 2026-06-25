import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Loader2, ClipboardList, Truck, DollarSign, AlertTriangle, ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabaseClient'
import { useAuth } from '@/contexts/AuthContext'
import type { Order, Sale } from '@/types/database'

interface DashboardData {
  openOrdersCount: number
  deliveriesTodayCount: number
  readyOrdersCount: number
  salesTodayTotal: number
  salesMonthTotal: number // NOVO
  lowStockCount: number
  topSellingProducts: { name: string, qtd: number }[] // NOVO
  recentOrders: Order[]
  recentSales: Sale[]
}

const statusConfig = {
  recebido: { label: 'Recebido', bg: 'bg-gray-100', text: 'text-gray-800' },
  em_andamento: { label: 'Em andamento', bg: 'bg-yellow-100', text: 'text-yellow-800' },
  pronto: { label: 'Pronto', bg: 'bg-green-100', text: 'text-green-800' },
  entregue: { label: 'Entregue', bg: 'bg-purple-100', text: 'text-purple-900' },
  cancelado: { label: 'Cancelado', bg: 'bg-red-50', text: 'text-red-700' },
}

const paymentConfig = {
  dinheiro: { label: 'Dinheiro', bg: 'bg-emerald-100', text: 'text-emerald-800' },
  pix: { label: 'Pix', bg: 'bg-teal-100', text: 'text-teal-800' },
  cartao_debito: { label: 'Débito', bg: 'bg-blue-100', text: 'text-blue-800' },
  cartao_credito: { label: 'Crédito', bg: 'bg-indigo-100', text: 'text-indigo-800' },
}

export function DashboardPage() {
  const { profile } = useAuth()
  const [data, setData] = useState<DashboardData | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Bom dia'
    if (hour < 18) return 'Boa tarde'
    return 'Boa noite'
  }

  const role = profile?.role || 'operador'
  const isCostureiro = role === 'costureiro'
  const isVendedor = role === 'vendedor'

  const currentDateFormatted = format(new Date(), "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR })
  const todayISO = new Date().toISOString().split('T')[0]

  useEffect(() => {
    async function fetchDashboardData() {
      setIsLoading(true)
      try {
        // 1. Pedidos em aberto (não entregues e não cancelados)
        const { count: openOrdersCount } = await supabase
          .from('orders')
          .select('*', { count: 'exact', head: true })
          .not('status', 'in', '("entregue","cancelado")')

        // 2. Entregas hoje (orders com delivery_date = hoje)
        // Como o Supabase salva a data, vamos comparar a string
        const { count: deliveriesTodayCount } = await supabase
          .from('orders')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'entregue')
          .eq('delivery_date', todayISO)

        // 3. Vendas hoje (soma de totais)
        const { data: salesToday } = await supabase
          .from('sales')
          .select('total')
          .gte('sale_date', `${todayISO}T00:00:00`)
          .lte('sale_date', `${todayISO}T23:59:59`)
        
        const salesTodayTotal = salesToday?.reduce((acc, sale) => acc + sale.total, 0) || 0

        // 4. Estoque baixo
        // Retorna todos os itens onde current_quantity < min_quantity
        // Como o supabase não suporta comparar duas colunas na mesma tabela via RPC simplificada sem escrever a query,
        // vamos trazer todos e filtrar no client (seguro para tabelas menores) ou melhor: usar uma query RPC se fosse grande.
        const { data: allItems } = await supabase.from('inventory_items').select('current_quantity, min_quantity')
        const lowStockCount = allItems?.filter(i => i.current_quantity < i.min_quantity).length || 0

        // 4.5 Pedidos Prontos (Status = pronto)
        const { count: readyOrdersCount } = await supabase
          .from('orders')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'pronto')

        // 5. Últimos 5 pedidos
        const { data: recentOrders } = await supabase
          .from('orders')
          .select('*, client:clients(*), service:services(*)')
          .order('created_at', { ascending: false })
          .limit(5)

        // 6. Últimas 5 vendas
        const { data: recentSales } = await supabase
          .from('sales')
          .select('*, client:clients(*)')
          .order('sale_date', { ascending: false })
          .limit(5)

        // 7. Vendas do Mês (Para Vendedor)
        const firstDayMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]
        const { data: monthSales } = await supabase
          .from('sales')
          .select('total, items')
          .gte('sale_date', `${firstDayMonth}T00:00:00`)
        
        const salesMonthTotal = monthSales?.reduce((acc, s) => acc + (s.total || 0), 0) || 0

        // 8. Top Produtos Vendidos (Ranking)
        const productsMap: Record<string, number> = {}
        monthSales?.forEach(sale => {
          sale.items.forEach((item: any) => {
            productsMap[item.name] = (productsMap[item.name] || 0) + (item.quantity || 1)
          })
        })
        const topSellingProducts = Object.entries(productsMap)
          .map(([name, qtd]) => ({ name, qtd }))
          .sort((a, b) => b.qtd - a.qtd)
          .slice(0, 5)

        setData({
          openOrdersCount: openOrdersCount || 0,
          deliveriesTodayCount: deliveriesTodayCount || 0,
          readyOrdersCount: readyOrdersCount || 0,
          salesTodayTotal,
          salesMonthTotal,
          lowStockCount,
          topSellingProducts,
          recentOrders: recentOrders || [],
          recentSales: recentSales || []
        })

      } catch (error) {
        console.error('Erro ao buscar dados do dashboard:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchDashboardData()
  }, [todayISO])

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)

  const formatOrderDate = (dateStr?: string | null) => {
    if (!dateStr) return '-'
    const d = new Date(dateStr)
    return format(d, 'dd/MM/yyyy', { locale: ptBR })
  }

  if (isLoading || !data) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4 text-purple-900">
        <Loader2 size={48} className="animate-spin" />
        <p className="text-xl font-bold">Carregando painel...</p>
      </div>
    )
  }

  return (
    <div className="space-y-10 pb-10">
      
      {/* Saudação */}
      <div>
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 tracking-tight">
          {getGreeting()}{profile?.name ? `, ${profile.name.split(' ')[0]}` : ''}!
        </h1>
        <p className="text-lg text-gray-500 font-medium mt-1 capitalize">
          {currentDateFormatted}
        </p>
      </div>

      {/* Grid de Resumo */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        
        {/* Card 1 - Pedidos em Aberto (Visível para Admin/Costureiro/Operador) */}
        {!isVendedor && (
          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
            <div className="bg-purple-100 text-purple-700 w-12 h-12 rounded-xl flex items-center justify-center mb-4">
              <ClipboardList size={24} />
            </div>
            <div>
              <p className="text-[32px] font-black text-gray-900 leading-none mb-1">{data.openOrdersCount}</p>
              <p className="text-[16px] font-medium text-gray-500">Pedidos em aberto</p>
            </div>
          </div>
        )}

        {/* Card Vendedor 1 - Vendas Mês (Exclusivo Vendedor no lugar de Pedidos em Aberto) */}
        {isVendedor && (
          <div className="bg-purple-900 text-white p-5 rounded-2xl shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
            <div className="bg-purple-800 text-purple-100 w-12 h-12 rounded-xl flex items-center justify-center mb-4">
              <DollarSign size={24} />
            </div>
            <div>
              <p className="text-[28px] font-black leading-none mb-1">{formatCurrency(data.salesMonthTotal)}</p>
              <p className="text-[15px] font-medium text-purple-200">Vendas do mês</p>
            </div>
          </div>
        )}

        {/* Card 2 - Pedidos Prontos (Aparece para Costureiro) */}
        {isCostureiro && (
          <div className="bg-blue-50 border-blue-200 p-5 rounded-2xl border shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
            <div className="bg-blue-100 text-blue-700 w-12 h-12 rounded-xl flex items-center justify-center mb-4">
              <ClipboardList size={24} />
            </div>
            <div>
              <p className="text-[32px] font-black text-blue-900 leading-none mb-1">{data.readyOrdersCount}</p>
              <p className="text-[16px] font-medium text-blue-700">Pedidos prontos</p>
            </div>
          </div>
        )}

        {/* Card de Entregas Hoje (Oculto para Vendedor) */}
        {!isVendedor && (
          <div className={`p-5 rounded-2xl border border-gray-200 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow ${isCostureiro ? 'bg-white' : 'bg-emerald-50 border-emerald-100'}`}>
            <div className={`${isCostureiro ? 'bg-emerald-100 text-emerald-700' : 'bg-emerald-100 text-emerald-700'} w-12 h-12 rounded-xl flex items-center justify-center mb-4`}>
              <Truck size={24} />
            </div>
            <div>
              <p className="text-[32px] font-black text-gray-900 leading-none mb-1">{data.deliveriesTodayCount}</p>
              <p className="text-[16px] font-medium text-gray-500">Entregas hoje</p>
            </div>
          </div>
        )}

        {/* Card 3 - Vendas Hoje (Oculto para Costureiro) */}
        {!isCostureiro && (
          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
            <div className="bg-emerald-100 text-emerald-700 w-12 h-12 rounded-xl flex items-center justify-center mb-4">
              <DollarSign size={24} />
            </div>
            <div>
              <p className="text-[32px] font-black text-gray-900 leading-none mb-1 tracking-tight">{formatCurrency(data.salesTodayTotal)}</p>
              <p className="text-[16px] font-medium text-gray-500">Vendas hoje</p>
            </div>
          </div>
        )}

        {/* Card 4 - Alerta Estoque (Oculto para Costureiro) */}
        {!isCostureiro && (
          <div className={`p-5 rounded-2xl border shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow ${data.lowStockCount > 0 ? 'bg-red-50 border-red-200' : 'bg-white border-gray-200'}`}>
            <div className={`${data.lowStockCount > 0 ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-500'} w-12 h-12 rounded-xl flex items-center justify-center mb-4`}>
              <AlertTriangle size={24} />
            </div>
            <div>
              <p className={`text-[32px] font-black leading-none mb-1 ${data.lowStockCount > 0 ? 'text-red-700' : 'text-gray-900'}`}>{data.lowStockCount}</p>
              <p className={`text-[16px] font-medium ${data.lowStockCount > 0 ? 'text-red-600' : 'text-gray-500'}`}>Estoque baixo</p>
            </div>
          </div>
        )}

        {/* Espaçador para manter o grid alinhado */}
        {(isCostureiro || (isVendedor && data.lowStockCount === 0)) && <div className="hidden lg:block"></div>}
      </div>

      {/* Seções de Listas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Últimos Pedidos (Oculto para Vendedor) */}
        {!isVendedor && (
          <div className={`bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col ${isCostureiro ? 'lg:col-span-2' : ''}`}>
            <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-gray-50">
              <h2 className="text-xl font-bold text-gray-900">Últimos pedidos</h2>
              <Link to="/costuraria" className="text-[16px] font-bold text-purple-700 hover:text-purple-900 flex items-center gap-1 transition-colors p-2 rounded-lg hover:bg-purple-100 focus-ring">
                Ver todos <ArrowRight size={18} />
              </Link>
            </div>
            
            <div className="flex-1 overflow-x-auto">
              {data.recentOrders.length === 0 ? (
                <p className="p-8 text-center text-gray-500 text-lg">Nenhum pedido recente.</p>
              ) : (
                <table className="w-full text-left border-collapse">
                  <tbody>
                    {data.recentOrders.map(order => {
                      const st = statusConfig[order.status]
                      return (
                        <tr key={order.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors group">
                          <td className="p-4">
                            <Link to="/costuraria" className="block focus:outline-none">
                              <span className="font-bold text-gray-700 bg-gray-100 px-2 py-1 rounded text-sm mr-3">
                                #{String(order.order_number).padStart(4, '0')}
                              </span>
                              <span className="font-bold text-gray-900 text-[16px] group-hover:text-purple-700 transition-colors">
                                {order.client?.name || '-'}
                              </span>
                              <p className="text-gray-500 text-sm mt-1">{order.service?.name || '-'}</p>
                            </Link>
                          </td>
                          <td className="p-4 text-right">
                            <span className={`inline-block px-3 py-1 rounded-full text-sm font-bold ${st.bg} ${st.text}`}>
                              {st.label}
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* Ranking de Produtos (Exclusivo Vendedor no lugar de Últimos Pedidos) */}
        {isVendedor && (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
            <div className="p-6 border-b border-gray-100 bg-gray-50">
              <h2 className="text-xl font-bold text-gray-900">Top produtos (Mês)</h2>
            </div>
            <div className="p-6 space-y-6">
              {data.topSellingProducts.map((item, idx) => (
                <div key={item.name} className="space-y-2">
                  <div className="flex justify-between items-end">
                    <span className="font-bold text-gray-700 text-[16px]">{idx + 1}. {item.name}</span>
                    <span className="font-black text-purple-900">{item.qtd} un.</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-purple-600 rounded-full" 
                      style={{ width: `${(item.qtd / data.topSellingProducts[0].qtd) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
              {data.topSellingProducts.length === 0 && <p className="text-center text-gray-500 py-10">Sem vendas registradas.</p>}
            </div>
          </div>
        )}

        {/* Últimas Vendas (Oculto para Costureiro) */}
        {!isCostureiro && (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-gray-50">
              <h2 className="text-xl font-bold text-gray-900">Últimas vendas</h2>
              <Link to="/loja" className="text-[16px] font-bold text-purple-700 hover:text-purple-900 flex items-center gap-1 transition-colors p-2 rounded-lg hover:bg-purple-100 focus-ring">
                Ver todas <ArrowRight size={18} />
              </Link>
            </div>
            
            <div className="flex-1 overflow-x-auto">
              {data.recentSales.length === 0 ? (
                <p className="p-8 text-center text-gray-500 text-lg">Nenhuma venda recente.</p>
              ) : (
                <table className="w-full text-left border-collapse">
                  <tbody>
                    {data.recentSales.map(sale => {
                      const pay1 = sale.payment_method ? paymentConfig[sale.payment_method] : null
                      const pay2 = sale.payment_method_2 ? paymentConfig[sale.payment_method_2] : null
                      return (
                        <tr key={sale.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors group">
                          <td className="p-4">
                            <Link to="/loja" className="block focus:outline-none">
                              <span className="font-bold text-gray-900 text-[16px] group-hover:text-purple-700 transition-colors">
                                {sale.items && sale.items.length > 0 
                                  ? `${sale.items[0].name}${sale.items.length > 1 ? ` +${sale.items.length - 1}` : ''}`
                                  : 'Venda'
                                }
                              </span>
                              <p className="text-gray-500 text-sm mt-1">
                                {sale.client?.name || sale.client_name_free || 'Cliente Avulso'} • {formatOrderDate(sale.sale_date)}
                              </p>
                            </Link>
                          </td>
                          <td className="p-4 text-right">
                            <p className="font-bold text-purple-900 text-[18px] mb-1">
                              {formatCurrency(sale.total || 0)}
                            </p>
                            <div className="flex flex-col items-end gap-1">
                              {pay1 && (
                                <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${pay1.bg} ${pay1.text}`}>
                                  {pay1.label} {sale.payment_method_2 ? `(${formatCurrency(sale.payment_amount_1)})` : ''}
                                </span>
                              )}
                              {pay2 && (
                                <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${pay2.bg} ${pay2.text}`}>
                                  {pay2.label} ({formatCurrency(sale.payment_amount_2)})
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
