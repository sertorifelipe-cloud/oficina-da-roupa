import { useState, useEffect, useCallback } from 'react'
import { Plus, Loader2, Store as StoreIcon } from 'lucide-react'
import { supabase } from '@/lib/supabaseClient'
import type { Sale, PaymentMethod } from '@/types/database'
import { SaleCard } from '@/components/loja/SaleCard'
import { NewSaleModal } from '@/components/loja/NewSaleModal'
import { toast } from 'sonner'
import { Input } from '@/components/ui/Input'

type FilterPayment = PaymentMethod | 'todos'

const filterOptions: { value: FilterPayment; label: string }[] = [
  { value: 'todos', label: 'Todos' },
  { value: 'dinheiro', label: 'Dinheiro' },
  { value: 'pix', label: 'Pix' },
  { value: 'cartao_debito', label: 'Débito' },
  { value: 'cartao_credito', label: 'Crédito' },
]

export function LojaPage() {
  const [sales, setSales] = useState<Sale[]>([])
  const [isLoading, setIsLoading] = useState(true)
  
  // Filtros
  const [activeFilter, setActiveFilter] = useState<FilterPayment>('todos')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  
  // Modal
  const [isNewSaleModalOpen, setIsNewSaleModalOpen] = useState(false)

  const fetchSales = useCallback(async () => {
    setIsLoading(true)
    try {
      let query = supabase
        .from('sales')
        .select(`
          *,
          client:clients(*),
          users_profiles(name)
        `)
        .order('sale_date', { ascending: false })

      if (activeFilter !== 'todos') {
        query = query.eq('payment_method', activeFilter)
      }

      if (dateFrom) {
        query = query.gte('sale_date', `${dateFrom}T00:00:00`)
      }
      if (dateTo) {
        query = query.lte('sale_date', `${dateTo}T23:59:59`)
      }

      const { data, error } = await query
      if (error) throw error
      setSales(data || [])
    } catch (error: any) {
      console.error('Erro ao buscar vendas:', error)
      toast.error('Não foi possível carregar as vendas.')
    } finally {
      setIsLoading(false)
    }
  }, [activeFilter, dateFrom, dateTo])

  useEffect(() => {
    fetchSales()
  }, [fetchSales])

  return (
    <div className="space-y-8 pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Loja (PDV)</h1>
        <button
          onClick={() => setIsNewSaleModalOpen(true)}
          className="flex items-center justify-center gap-2 h-[52px] px-6 rounded-xl text-[18px] font-bold text-white bg-purple-900 hover:bg-purple-800 transition-colors shadow-md focus-ring"
        >
          <Plus size={24} strokeWidth={2.5} />
          Nova venda
        </button>
      </div>

      <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm space-y-4">
        <h3 className="text-lg font-bold text-gray-800">Filtros</h3>
        
        <div className="flex flex-col md:flex-row gap-6">
          <div className="flex-1 grid grid-cols-2 gap-4">
            <Input
              label="Data Inicial (De)"
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />
            <Input
              label="Data Final (Até)"
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
            />
          </div>
          
          <div className="flex-1">
            <p className="text-lg font-semibold text-gray-800 mb-2">Método de Pagamento</p>
            <div className="flex flex-wrap gap-2">
              {filterOptions.map(option => (
                <button
                  key={option.value}
                  onClick={() => setActiveFilter(option.value)}
                  className={[
                    'h-12 px-4 rounded-full text-[14px] font-bold transition-all focus-ring',
                    activeFilter === option.value
                      ? 'bg-purple-900 text-white shadow-md'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  ].join(' ')}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4 text-purple-900">
          <Loader2 size={40} className="animate-spin" />
          <p className="text-lg font-medium">Buscando histórico...</p>
        </div>
      ) : sales.length === 0 ? (
        <div className="flex flex-col items-center justify-center bg-white rounded-2xl border border-gray-200 border-dashed py-20 px-4 text-center">
          <div className="bg-gray-100 p-4 rounded-full text-gray-400 mb-4">
            <StoreIcon size={48} />
          </div>
          <h3 className="text-xl font-bold text-gray-800 mb-2">Nenhuma venda encontrada</h3>
          <p className="text-gray-500 text-lg max-w-md">
            Experimente mudar os filtros de data ou clique em "Nova venda" para registrar uma saída.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sales.map(sale => (
            <SaleCard key={sale.id} sale={sale} />
          ))}
        </div>
      )}

      <NewSaleModal
        isOpen={isNewSaleModalOpen}
        onClose={() => setIsNewSaleModalOpen(false)}
        onSuccess={() => {
          setIsNewSaleModalOpen(false)
          fetchSales()
        }}
      />
    </div>
  )
}
