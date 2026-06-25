import { useState, useEffect } from 'react'
import { Download, Search, AlertTriangle, Loader2 } from 'lucide-react'
import { format, isBefore, startOfDay } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { supabase } from '@/lib/supabaseClient'
import { Input } from '@/components/ui/Input'
import { toast } from 'sonner'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import type { Order, Sale, InventoryItem } from '@/types/database'
import { useAuth } from '@/contexts/AuthContext'

type Tab = 'entrega' | 'vendas' | 'estoque'

const statusConfig = {
  recebido: { label: 'Recebido', bg: 'bg-gray-100', text: 'text-gray-800' },
  em_andamento: { label: 'Em andamento', bg: 'bg-yellow-100', text: 'text-yellow-800' },
  pronto: { label: 'Pronto', bg: 'bg-green-100', text: 'text-green-800' },
  entregue: { label: 'Entregue', bg: 'bg-purple-100', text: 'text-purple-900' },
  cancelado: { label: 'Cancelado', bg: 'bg-red-50', text: 'text-red-700' },
}

const paymentConfig = {
  dinheiro: 'Dinheiro',
  pix: 'Pix',
  cartao_debito: 'Cartão de Débito',
  cartao_credito: 'Cartão de Crédito',
}

export function RelatoriosPage() {
  const { profile } = useAuth()
  
  if (profile?.role !== 'admin') {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-16 h-16 text-red-500 mb-4">
          <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 0 0 5.636 5.636m12.728 12.728A9 9 0 0 1 5.636 5.636m12.728 12.728L5.636 5.636" />
        </svg>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Acesso Restrito</h1>
        <p className="text-gray-500 text-lg max-w-md">
          Apenas administradores podem acessar a tela de relatórios. Se você precisa de acesso, fale com o administrador do sistema.
        </p>
      </div>
    )
  }

  const isAdmin = profile?.role === 'admin'
  const [activeTab, setActiveTab] = useState<Tab>('entrega')
  const [inventoryMap, setInventoryMap] = useState<Record<string, number>>({})
  
  // Filtros Globais (Data)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  
  const [isLoading, setIsLoading] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)

  // Dados
  const [orders, setOrders] = useState<Order[]>([])
  const [sales, setSales] = useState<Sale[]>([])
  const [inventory, setInventory] = useState<InventoryItem[]>([])
  const [services, setServices] = useState<{id: string, name: string}[]>([])

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)
  
  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return '-'
    try {
      const date = new Date(dateStr.includes('T') ? dateStr : `${dateStr}T12:00:00`)
      if (isNaN(date.getTime())) return '-'
      return format(date, 'dd/MM/yyyy', { locale: ptBR })
    } catch (err) {
      console.error('Erro ao formatar data:', dateStr, err)
      return '-'
    }
  }

  // Busca de dados
  const handleSearch = async () => {
    if (activeTab !== 'estoque' && (!dateFrom || !dateTo)) {
      return toast.error('Selecione as datas inicial e final para buscar.')
    }
    
    setIsLoading(true)
    setHasSearched(true)
    
    try {
      if (activeTab === 'entrega') {
        const { data, error } = await supabase
          .from('orders')
          .select('*, client:clients(name), service:services(name)')
          .gte('entry_date', `${dateFrom}`)
          .lte('entry_date', `${dateTo}`)
          .order('entry_date', { ascending: false })

        // Carregar lista de serviços para traduzir IDs se necessário
        const { data: servs } = await supabase.from('services').select('id, name')
        if (servs) setServices(servs)
        
        if (error) throw error
        setOrders(data || [])
      }
      
      if (activeTab === 'vendas') {
        const { data, error } = await supabase
          .from('sales')
          .select('*, client:clients(name), users_profiles(name)')
          .gte('sale_date', `${dateFrom}T00:00:00`)
          .lte('sale_date', `${dateTo}T23:59:59`)
        
        if (error) throw error
        setSales(data || [])

        // Carrega preços de custo se for admin para metrificar lucro
        if (profile?.role === 'admin') {
          const { data: itemsData } = await supabase
            .from('inventory_items')
            .select('id, cost_price')
          if (itemsData) {
            const map: Record<string, number> = {}
            itemsData.forEach(item => {
              map[item.id] = item.cost_price || 0
            })
            setInventoryMap(map)
          }
        }
      }

    } catch (error) {
      console.error('Erro na busca de relatórios:', error)
      toast.error('Ocorreu um erro ao buscar os dados.')
    } finally {
      setIsLoading(false)
    }
  }

  // Busca automática do estoque ao mudar de aba
  useEffect(() => {
    if (activeTab === 'estoque') {
      setIsLoading(true)
      setHasSearched(true)
      supabase
        .from('inventory_items')
        .select('*')
        .order('name')
        .then(({ data }) => {
          // Ordenar: estoque baixo primeiro
          const sorted = (data || []).sort((a, b) => {
            const aLow = a.current_quantity < a.min_quantity ? -1 : 1
            const bLow = b.current_quantity < b.min_quantity ? -1 : 1
            if (aLow !== bLow) return aLow
            return a.name.localeCompare(b.name)
          })
          setInventory(sorted)
          setIsLoading(false)
        })
    }
  }, [activeTab])

  // --- Lógicas do Relatório de Entrega ---
  const today = startOfDay(new Date())
  const activeOrders = orders.filter(order => order.status !== 'cancelado')
  let ordersLate = 0
  let ordersDelivered = 0
  let ordersOpen = 0
  let ordersTotalValue = 0

  // Consolidação de pagamentos da Costuraria (Entrada + Saldo de Entrega)
  const costurariaPaymentStats: Record<string, { total: number; qtd: number }> = {
    dinheiro: { total: 0, qtd: 0 },
    pix: { total: 0, qtd: 0 },
    cartao_debito: { total: 0, qtd: 0 },
    cartao_credito: { total: 0, qtd: 0 },
  }
  let costurariaTotalReceived = 0
  let costurariaTotalPending = 0

  activeOrders.forEach(order => {
    ordersTotalValue += (order.price || 0)
    if (order.status === 'entregue') {
      ordersDelivered++
    } else {
      ordersOpen++
      if (order.expected_date && isBefore(new Date(`${order.expected_date}T12:00:00`), today)) {
        ordersLate++
      }
    }

    // 1. Pagamento de entrada
    if (order.amount_paid > 0 && order.payment_method) {
      const method = order.payment_method
      if (costurariaPaymentStats[method]) {
        costurariaPaymentStats[method].total += order.amount_paid
        costurariaPaymentStats[method].qtd += 1
      }
      costurariaTotalReceived += order.amount_paid
    }

    // 2. Pagamento de entrega (se status entregue e tiver saldo restante)
    const totalOrderPrice = order.price || 0
    const entryPaid = order.amount_paid || 0
    if (order.status === 'entregue') {
      const deliveryAmount = totalOrderPrice - entryPaid
      if (deliveryAmount > 0 && order.delivery_payment_method) {
        const method = order.delivery_payment_method
        if (costurariaPaymentStats[method]) {
          costurariaPaymentStats[method].total += deliveryAmount
          costurariaPaymentStats[method].qtd += 1
        }
        costurariaTotalReceived += deliveryAmount
      }
    } else {
      // Pedido não entregue: o saldo pendente a receber é o valor total - entrada
      const pendingAmount = totalOrderPrice - entryPaid
      if (pendingAmount > 0) {
        costurariaTotalPending += pendingAmount
      }
    }
  })

  const orderTicketMedio = activeOrders.length > 0 ? ordersTotalValue / activeOrders.length : 0

  // Top Serviços Rentáveis (Costuraria)
  const serviceRevenue: Record<string, number> = {}
  activeOrders.forEach(order => {
    // Se tiver múltiplos serviços (services_items), somamos cada um
    if (order.services_items && order.services_items.length > 0) {
      order.services_items.forEach(item => {
        // Precisamos do nome do serviço, vamos buscar no objeto service que vem do join
        const sName = services.find(s => s.id === item.service_id)?.name || 'Outro'
        serviceRevenue[sName] = (serviceRevenue[sName] || 0) + item.price
      })
    } else {
      // Caso antigo ou simplificado
      const sName = order.service?.name || 'Outro'
      serviceRevenue[sName] = (serviceRevenue[sName] || 0) + (order.price || 0)
    }
  })

  const topCosturariaData = Object.entries(serviceRevenue)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5)

  // --- Lógicas do Relatório de Vendas ---
  const salesTotal = sales.reduce((acc, s) => acc + (s.total || 0), 0)
  const salesCount = sales.length
  const ticketMedio = salesCount > 0 ? salesTotal / salesCount : 0

  // Custo total e Lucro (apenas admin)
  let totalCost = 0
  if (isAdmin) {
    sales.forEach(sale => {
      if (sale.items) {
        sale.items.forEach((item: any) => {
          const unitCost = inventoryMap[item.id] || 0
          totalCost += unitCost * item.quantity
        })
      }
    })
  }
  const estimatedProfit = salesTotal - totalCost
  const profitMargin = salesTotal > 0 ? (estimatedProfit / salesTotal) * 100 : 0

  // Top 8 serviços
  const itemsMap: Record<string, number> = {}
  sales.forEach(sale => {
    sale.items.forEach((item: any) => {
      itemsMap[item.name] = (itemsMap[item.name] || 0) + item.quantity
    })
  })
  
  const topServicesData = Object.entries(itemsMap)
    .map(([name, qtd]) => ({ name, qtd }))
    .sort((a, b) => b.qtd - a.qtd)
    .slice(0, 8)

  // Vendas por Forma de Pagamento
  const paymentStats: Record<string, { qtd: number, total: number }> = {}
  sales.forEach(sale => {
    // Primeira forma
    const method1 = sale.payment_method || 'dinheiro'
    const amount1 = sale.payment_amount_1 !== null && sale.payment_amount_1 !== undefined 
      ? sale.payment_amount_1 
      : (sale.total || 0)
    
    if (!paymentStats[method1]) paymentStats[method1] = { qtd: 0, total: 0 }
    paymentStats[method1].qtd += 1 // Conta como 1 transação (ou split)
    paymentStats[method1].total += amount1

    // Segunda forma
    if (sale.payment_method_2 && sale.payment_amount_2) {
      const method2 = sale.payment_method_2
      if (!paymentStats[method2]) paymentStats[method2] = { qtd: 0, total: 0 }
      paymentStats[method2].qtd += 1
      paymentStats[method2].total += sale.payment_amount_2
    }
  })

  // Vendas por Vendedor
  const sellerStats: Record<string, { qtd: number, total: number }> = {}
  sales.forEach(sale => {
    const seller = sale.users_profiles?.name || 'Não identificado'
    if (!sellerStats[seller]) sellerStats[seller] = { qtd: 0, total: 0 }
    sellerStats[seller].qtd += 1
    sellerStats[seller].total += sale.total || 0
  })

  // --- Exportações CSV ---
  const downloadCSV = (content: string, filename: string) => {
    const blob = new Blob(['\uFEFF' + content], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const exportEntrega = () => {
    let csv = 'Comanda;Cliente;Data Entrada;Previsão;Data Entrega;Valor Total;Valor Pago Entrada;Meio Pagamento Entrada;Saldo Retirada;Meio Pagamento Retirada;Total Recebido;Pendente;Status;Atrasado?\n'
    orders.forEach(o => {
      const isLate = o.status !== 'entregue' && o.expected_date && isBefore(new Date(`${o.expected_date}T12:00:00`), today)
      const totalOrderPrice = o.price || 0
      const entryPaid = o.amount_paid || 0
      const deliveryPaid = o.status === 'entregue' ? (totalOrderPrice - entryPaid) : 0
      const totalRec = entryPaid + deliveryPaid
      const pending = o.status !== 'entregue' ? (totalOrderPrice - entryPaid) : 0

      csv += `"${String(o.order_number).padStart(4, '0')}";"${o.client?.name || '-'}";"${o.entry_date}";"${o.expected_date}";"${o.delivery_date || '-'}";"${totalOrderPrice}";"${entryPaid}";"${o.payment_method ? (paymentConfig[o.payment_method] || o.payment_method) : '-'}";"${deliveryPaid}";"${o.delivery_payment_method ? (paymentConfig[o.delivery_payment_method] || o.delivery_payment_method) : '-'}";"${totalRec}";"${pending}";"${statusConfig[o.status].label}";"${isLate ? 'SIM' : 'NÃO'}"\n`
    })
    downloadCSV(csv, 'relatorio_entregas.csv')
  }

  const exportVendas = () => {
    let csv = 'Data/Hora;Cliente;Vendedor;Método Pagamento;Subtotal;Desconto;Total;Itens (Qtd)\n'
    sales.forEach(s => {
      let paymentStr = s.payment_method ? (paymentConfig[s.payment_method]?.label || s.payment_method) : '-'
      if (s.payment_method_2) {
        paymentStr += ` / ${paymentConfig[s.payment_method_2]?.label || s.payment_method_2}`
      }
      csv += `"${format(new Date(s.sale_date), 'dd/MM/yyyy HH:mm')}";"${s.client?.name || s.client_name_free || '-'}";"${s.users_profiles?.name || '-' }";"${paymentStr}";"${s.subtotal}";"${s.discount}";"${s.total}";"${s.items.length}"\n`
    })
    downloadCSV(csv, 'relatorio_vendas.csv')
  }

  const exportEstoque = () => {
    let csv = isAdmin
      ? 'Item;Categoria;Unidade;Preço Venda;Preço Custo;Estoque Mínimo;Estoque Atual;Status\n'
      : 'Item;Categoria;Unidade;Preço Venda;Estoque Mínimo;Estoque Atual;Status\n'
    inventory.forEach(i => {
      const status = i.current_quantity < i.min_quantity ? 'BAIXO' : 'OK'
      csv += isAdmin
        ? `"${i.name}";"${i.category || '-'}";"${i.unit}";"${i.base_price}";"${i.cost_price || 0}";"${i.min_quantity}";"${i.current_quantity}";"${status}"\n`
        : `"${i.name}";"${i.category || '-'}";"${i.unit}";"${i.base_price}";"${i.min_quantity}";"${i.current_quantity}";"${status}"\n`
    })
    downloadCSV(csv, 'relatorio_estoque.csv')
  }

  return (
    <div className="space-y-8 pb-10">
      <h1 className="text-3xl font-bold text-gray-900">Relatórios Gerenciais</h1>

      {/* Navegação de Abas */}
      <div className="flex flex-col md:flex-row gap-2 bg-gray-100 p-1.5 rounded-2xl">
        <button
          onClick={() => { setActiveTab('entrega'); setHasSearched(false); setOrders([]); }}
          className={`flex-1 py-4 text-[17px] font-bold rounded-xl transition-all focus-ring ${activeTab === 'entrega' ? 'bg-white text-purple-900 shadow-sm' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200'}`}
        >
          📋 Relatório de entrega
        </button>
        <button
          onClick={() => { setActiveTab('vendas'); setHasSearched(false); setSales([]); }}
          className={`flex-1 py-4 text-[17px] font-bold rounded-xl transition-all focus-ring ${activeTab === 'vendas' ? 'bg-white text-purple-900 shadow-sm' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200'}`}
        >
          💰 Relatório de vendas
        </button>
        <button
          onClick={() => { setActiveTab('estoque'); }}
          className={`flex-1 py-4 text-[17px] font-bold rounded-xl transition-all focus-ring ${activeTab === 'estoque' ? 'bg-white text-purple-900 shadow-sm' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200'}`}
        >
          📦 Estoque atual
        </button>
      </div>

      {/* Filtros para Entrega e Vendas */}
      {activeTab !== 'estoque' && (
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
          <div className="flex flex-col md:flex-row items-end gap-6">
            <div className="w-full md:w-1/3">
              <Input
                label="Período De"
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>
            <div className="w-full md:w-1/3">
              <Input
                label="Período Até"
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>
            <div className="w-full md:w-1/3">
              <button
                onClick={handleSearch}
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2 h-14 rounded-xl text-[18px] font-bold text-white bg-purple-900 hover:bg-purple-800 transition-colors shadow-md focus-ring disabled:opacity-70"
              >
                {isLoading ? <Loader2 className="animate-spin" size={24} /> : <Search size={24} />}
                Buscar dados
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Estado sem busca */}
      {!hasSearched && activeTab !== 'estoque' ? (
        <div className="flex flex-col items-center justify-center py-20 px-4 text-center border-2 border-dashed border-gray-200 rounded-2xl bg-gray-50">
          <div className="bg-white p-4 rounded-full text-gray-400 mb-4 shadow-sm">
            <Search size={48} />
          </div>
          <h3 className="text-xl font-bold text-gray-800 mb-2">Pronto para buscar</h3>
          <p className="text-gray-500 text-lg max-w-md">
            Selecione o período acima e clique em "Buscar dados" para ver o relatório.
          </p>
        </div>
      ) : isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4 text-purple-900">
          <Loader2 size={40} className="animate-spin" />
          <p className="text-lg font-medium">Processando relatório...</p>
        </div>
      ) : (
        <>
          {/* ======================= ABA ENTREGA ======================= */}
          {activeTab === 'entrega' && hasSearched && (
            <div className="space-y-8">
              {/* Resumo Financeiro Costuraria */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-emerald-900 text-white p-6 rounded-2xl shadow-sm">
                  <p className="text-emerald-100 text-[18px] font-medium mb-1">Faturamento Costuraria</p>
                  <p className="text-[36px] font-black">{formatCurrency(ordersTotalValue)}</p>
                  <p className="text-sm text-emerald-200 mt-1">Total de {orders.length} pedidos no período</p>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
                  <p className="text-gray-500 text-[18px] font-medium mb-1">Ticket Médio (Comanda)</p>
                  <p className="text-[36px] font-black text-gray-900">{formatCurrency(orderTicketMedio)}</p>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 flex flex-col justify-center">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-gray-500 font-medium">Entregues:</span>
                    <span className="font-bold text-gray-900">{ordersDelivered}</span>
                  </div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-gray-500 font-medium">Em aberto:</span>
                    <span className="font-bold text-gray-900">{ordersOpen}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-red-600 font-bold">Atrasados:</span>
                    <span className="font-bold text-red-700">{ordersLate}</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Tabela */}
                <div className="lg:col-span-2 bg-white rounded-2xl border shadow-sm overflow-hidden h-fit">
                  <div className="p-6 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
                    <h2 className="text-xl font-bold text-gray-900">Listagem de Comandas</h2>
                    <button onClick={exportEntrega} className="flex items-center gap-2 h-10 px-4 rounded-lg font-bold text-sm text-gray-700 bg-white border border-gray-200 hover:bg-gray-50">
                      <Download size={18} /> Exportar CSV
                    </button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead className="bg-gray-50 border-b border-gray-200 text-gray-600 text-[14px]">
                        <tr>
                          <th className="p-4 font-bold">Comanda</th>
                          <th className="p-4 font-bold">Cliente</th>
                          <th className="p-4 font-bold">Entrada</th>
                          <th className="p-4 font-bold">Retirada</th>
                          <th className="p-4 font-bold text-right">Valor Total</th>
                          <th className="p-4 font-bold text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {orders.length === 0 ? (
                          <tr><td colSpan={6} className="p-8 text-center text-gray-500">Nenhum pedido encontrado.</td></tr>
                        ) : (
                          orders.map(o => {
                            const st = statusConfig[o.status]
                            const totalOrderPrice = o.price || 0
                            const entryPaid = o.amount_paid || 0
                            const deliveryPaid = o.status === 'entregue' ? (totalOrderPrice - entryPaid) : 0
                            const pending = o.status !== 'entregue' ? (totalOrderPrice - entryPaid) : 0

                            return (
                              <tr key={o.id} className={`border-b border-gray-100 transition-colors hover:bg-gray-50`}>
                                <td className="p-4 font-bold text-gray-700 text-[16px]">#{String(o.order_number).padStart(4, '0')}</td>
                                <td className="p-4">
                                  <p className="font-bold text-gray-900">{o.client?.name || '-'}</p>
                                  <p className="text-xs text-gray-500">{formatDate(o.entry_date)}</p>
                                </td>
                                <td className="p-4">
                                  {entryPaid > 0 ? (
                                    <div>
                                      <p className="font-bold text-emerald-800">{formatCurrency(entryPaid)}</p>
                                      <p className="text-[11px] text-gray-500 uppercase">{o.payment_method ? (paymentConfig[o.payment_method] || o.payment_method) : '-'}</p>
                                    </div>
                                  ) : (
                                    <span className="text-gray-400 text-sm">-</span>
                                  )}
                                </td>
                                <td className="p-4">
                                  {o.status === 'entregue' ? (
                                    deliveryPaid > 0 ? (
                                      <div>
                                        <p className="font-bold text-purple-900">{formatCurrency(deliveryPaid)}</p>
                                        <p className="text-[11px] text-gray-500 uppercase">{o.delivery_payment_method ? (paymentConfig[o.delivery_payment_method] || o.delivery_payment_method) : '-'}</p>
                                      </div>
                                    ) : (
                                      <span className="text-emerald-700 text-xs font-semibold">Sem saldo devedor</span>
                                    )
                                  ) : (
                                    pending > 0 ? (
                                      <div>
                                        <p className="font-medium text-amber-700">{formatCurrency(pending)}</p>
                                        <p className="text-[11px] text-amber-600 font-semibold uppercase">Pendente</p>
                                      </div>
                                    ) : (
                                      <span className="text-gray-400 text-sm">-</span>
                                    )
                                  )}
                                </td>
                                <td className="p-4 font-bold text-purple-900 text-right">{formatCurrency(totalOrderPrice)}</td>
                                <td className="p-4 text-center">
                                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${st.bg} ${st.text}`}>
                                    {st.label}
                                  </span>
                                </td>
                              </tr>
                            )
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Coluna Lateral de Resumos */}
                <div className="space-y-8 lg:col-span-1">
                  {/* Tabela de Recebimentos por Forma de Pagamento */}
                  <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col h-fit">
                    <h3 className="text-xl font-bold text-gray-900 p-6 border-b border-gray-100 bg-gray-50">Recebimentos por Forma de Pagamento</h3>
                    <div className="p-6">
                      <table className="w-full text-left">
                        <thead>
                          <tr className="text-gray-500 border-b border-gray-200">
                            <th className="pb-3 font-semibold text-[15px]">Método</th>
                            <th className="pb-3 font-semibold text-[15px] text-center">Uso</th>
                            <th className="pb-3 font-semibold text-[15px] text-right">Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {Object.entries(costurariaPaymentStats).map(([method, data]) => {
                            return (
                              <tr key={method} className="border-b border-gray-100 last:border-0 hover:bg-gray-50/50">
                                <td className="py-3 text-[16px] font-bold text-gray-800">{paymentConfig[method as keyof typeof paymentConfig] || method}</td>
                                <td className="py-3 text-[16px] text-gray-600 text-center">{data.qtd}</td>
                                <td className="py-3 text-[16px] font-bold text-purple-900 text-right">{formatCurrency(data.total)}</td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                      
                      <div className="mt-4 pt-4 border-t border-gray-200 space-y-2">
                        <div className="flex justify-between items-center text-[15px] text-gray-600">
                          <span>Total Recebido (Caixa):</span>
                          <span className="font-bold text-emerald-700">{formatCurrency(costurariaTotalReceived)}</span>
                        </div>
                        <div className="flex justify-between items-center text-[15px] text-gray-600">
                          <span>Total Pendente (A Receber):</span>
                          <span className="font-bold text-amber-700">{formatCurrency(costurariaTotalPending)}</span>
                        </div>
                        <div className="flex justify-between items-center text-[16px] font-bold text-gray-900 pt-1 border-t border-dashed border-gray-200">
                          <span>Total Geral Comandas:</span>
                          <span>{formatCurrency(ordersTotalValue)}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Serviços mais rentáveis */}
                  <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm h-fit">
                    <h3 className="text-xl font-bold text-gray-900 mb-6">Top Serviços (Receita)</h3>
                    <div className="space-y-6">
                      {topCosturariaData.map((item, idx) => (
                        <div key={item.name} className="space-y-2">
                          <div className="flex justify-between items-end">
                            <span className="font-bold text-gray-700">{idx + 1}. {item.name}</span>
                            <span className="font-black text-purple-900">{formatCurrency(item.value)}</span>
                          </div>
                          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-emerald-500 rounded-full" 
                              style={{ width: `${topCosturariaData[0]?.value ? (item.value / topCosturariaData[0].value) * 100 : 0}%` }}
                            />
                          </div>
                        </div>
                      ))}
                      {topCosturariaData.length === 0 && <p className="text-center text-gray-500 py-10">Sem dados financeiros.</p>}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ======================= ABA VENDAS ======================= */}
          {activeTab === 'vendas' && hasSearched && (
            <div className="space-y-6">
              {/* Resumo Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-5 gap-6">
                <div className="bg-purple-900 text-white p-6 rounded-2xl shadow-sm">
                  <p className="text-purple-200 text-[18px] font-medium mb-1">Faturamento Bruto</p>
                  <p className="text-[36px] font-black">{formatCurrency(salesTotal)}</p>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
                  <p className="text-gray-500 text-[18px] font-medium mb-1">Número de Vendas</p>
                  <p className="text-[36px] font-black text-gray-900">{salesCount}</p>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
                  <p className="text-gray-500 text-[18px] font-medium mb-1">Ticket Médio</p>
                  <p className="text-[36px] font-black text-gray-900">{formatCurrency(ticketMedio)}</p>
                </div>
                {isAdmin && (
                  <>
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
                      <p className="text-gray-500 text-[18px] font-medium mb-1">Custo Total (CMV)</p>
                      <p className="text-[36px] font-black text-red-600">{formatCurrency(totalCost)}</p>
                    </div>
                    <div className="bg-emerald-900 text-white p-6 rounded-2xl shadow-sm">
                      <p className="text-emerald-200 text-[18px] font-medium mb-1">Lucro Estimado</p>
                      <p className="text-[36px] font-black">{formatCurrency(estimatedProfit)}</p>
                      <p className="text-sm text-emerald-300 mt-1">Margem de Lucro: {profitMargin.toFixed(1)}%</p>
                    </div>
                  </>
                )}
              </div>

              {salesCount > 0 && (
                <div className="flex justify-end">
                  <button onClick={exportVendas} className="flex items-center gap-2 h-12 px-6 rounded-xl font-bold text-gray-700 bg-white border-2 border-gray-200 hover:bg-gray-50 transition-colors focus-ring">
                    <Download size={20} /> Exportar CSV
                  </button>
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Gráfico */}
                <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm h-[400px]">
                  <h3 className="text-xl font-bold text-gray-900 mb-6">Top Serviços/Produtos</h3>
                  {topServicesData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={topServicesData} layout="vertical" margin={{ top: 0, right: 30, left: 40, bottom: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                        <XAxis type="number" />
                        <YAxis dataKey="name" type="category" width={120} tick={{ fill: '#4b5563', fontSize: 14 }} />
                        <Tooltip 
                          cursor={{ fill: '#f3e8ff' }} 
                          contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        />
                        <Bar dataKey="qtd" fill="#4C1D95" radius={[0, 4, 4, 0]} name="Qtd Vendida" />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-gray-500 text-lg">Sem dados para exibir</div>
                  )}
                </div>

                {/* Tabela Meios de Pagamento */}
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col h-[400px]">
                  <h3 className="text-xl font-bold text-gray-900 p-6 border-b border-gray-100 bg-gray-50">Vendas por Forma de Pagamento</h3>
                  <div className="flex-1 overflow-auto p-6">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="text-gray-500 border-b border-gray-200">
                          <th className="pb-3 font-semibold text-[16px]">Método</th>
                          <th className="pb-3 font-semibold text-[16px] text-center">Qtd</th>
                          <th className="pb-3 font-semibold text-[16px] text-right">Total</th>
                          <th className="pb-3 font-semibold text-[16px] text-right">%</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Object.entries(paymentStats).map(([method, data]) => {
                          const percentage = salesTotal > 0 ? (data.total / salesTotal) * 100 : 0
                          return (
                            <tr key={method} className="border-b border-gray-100 last:border-0">
                              <td className="py-4 text-[18px] font-bold text-gray-800">{paymentConfig[method as keyof typeof paymentConfig] || method}</td>
                              <td className="py-4 text-[18px] text-gray-600 text-center">{data.qtd}</td>
                              <td className="py-4 text-[18px] font-bold text-gray-900 text-right">{formatCurrency(data.total || 0)}</td>
                              <td className="py-4 text-[16px] text-gray-500 text-right">{percentage.toFixed(1)}%</td>
                            </tr>
                          )
                        })}
                        {salesCount === 0 && (
                          <tr><td colSpan={4} className="py-8 text-center text-gray-500 text-lg">Nenhuma venda encontrada.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Tabela Vendas por Vendedor */}
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col h-[400px]">
                  <h3 className="text-xl font-bold text-gray-900 p-6 border-b border-gray-100 bg-gray-50">Vendas por Vendedor</h3>
                  <div className="flex-1 overflow-auto p-6">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="text-gray-500 border-b border-gray-200">
                          <th className="pb-3 font-semibold text-[16px]">Vendedor</th>
                          <th className="pb-3 font-semibold text-[16px] text-center">Qtd</th>
                          <th className="pb-3 font-semibold text-[16px] text-right">Total</th>
                          <th className="pb-3 font-semibold text-[16px] text-right">%</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Object.entries(sellerStats).map(([seller, data]) => {
                          const percentage = salesTotal > 0 ? (data.total / salesTotal) * 100 : 0
                          return (
                            <tr key={seller} className="border-b border-gray-100 last:border-0">
                              <td className="py-4 text-[18px] font-bold text-gray-800">{seller}</td>
                              <td className="py-4 text-[18px] text-gray-600 text-center">{data.qtd}</td>
                              <td className="py-4 text-[18px] font-bold text-gray-900 text-right">{formatCurrency(data.total || 0)}</td>
                              <td className="py-4 text-[16px] text-gray-500 text-right">{percentage.toFixed(1)}%</td>
                            </tr>
                          )
                        })}
                        {salesCount === 0 && (
                          <tr><td colSpan={4} className="py-8 text-center text-gray-500 text-lg">Nenhuma venda encontrada.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ======================= ABA ESTOQUE ======================= */}
          {activeTab === 'estoque' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center bg-white p-4 rounded-2xl border shadow-sm">
                <p className="text-lg text-gray-700 font-medium"><strong>{inventory.length}</strong> itens catalogados no estoque</p>
                <button onClick={exportEstoque} className="flex items-center gap-2 h-12 px-6 rounded-xl font-bold text-gray-700 bg-white border-2 border-gray-200 hover:bg-gray-50 transition-colors focus-ring">
                  <Download size={20} /> Exportar CSV
                </button>
              </div>

              <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left min-w-[800px]">
                    <thead className="bg-gray-50 border-b border-gray-200 text-gray-600 text-[15px]">
                      <tr>
                        <th className="p-4 font-bold w-1/4">Item</th>
                        <th className="p-4 font-bold text-center">Preço Venda</th>
                        {isAdmin && <th className="p-4 font-bold text-center">Preço Custo</th>}
                        <th className="p-4 font-bold text-center">Mínimo</th>
                        <th className="p-4 font-bold text-center">Atual</th>
                        <th className="p-4 font-bold w-1/4">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {inventory.length === 0 ? (
                        <tr><td colSpan={4} className="p-8 text-center text-gray-500 text-lg">Estoque vazio.</td></tr>
                      ) : (
                        inventory.map(item => {
                          const isLow = item.current_quantity < item.min_quantity
                          const percentage = item.min_quantity > 0 
                            ? Math.min(100, (item.current_quantity / (item.min_quantity * 2)) * 100)
                            : 100

                          return (
                            <tr key={item.id} className={`border-b border-gray-100 ${isLow ? 'bg-red-50/30' : 'hover:bg-gray-50'}`}>
                              <td className="p-4">
                                <p className="text-[18px] font-bold text-gray-900">{item.name}</p>
                                {item.category && <p className="text-sm text-gray-500">{item.category}</p>}
                              </td>
                              <td className="p-4 text-[18px] font-medium text-gray-900 text-center">{formatCurrency(item.base_price)}</td>
                              {isAdmin && (
                                <td className="p-4 text-[18px] font-medium text-amber-700 text-center">{formatCurrency(item.cost_price)}</td>
                              )}
                              <td className="p-4 text-[18px] font-medium text-gray-600 text-center">{item.min_quantity} {item.unit}</td>
                              <td className={`p-4 text-[20px] font-black text-center ${isLow ? 'text-red-600' : 'text-gray-900'}`}>
                                {item.current_quantity} {item.unit}
                              </td>
                              <td className="p-4">
                                <div className="space-y-1.5 w-full max-w-[200px]">
                                  <div className="flex justify-between text-xs font-bold uppercase tracking-wider">
                                    {isLow ? <span className="text-red-600 flex items-center gap-1"><AlertTriangle size={12}/> BAIXO</span> : <span className="text-green-600">OK</span>}
                                  </div>
                                  <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
                                    <div 
                                      className={`h-full transition-all duration-500 ${isLow ? 'bg-red-500' : 'bg-green-500'}`}
                                      style={{ width: `${percentage}%` }}
                                    />
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
