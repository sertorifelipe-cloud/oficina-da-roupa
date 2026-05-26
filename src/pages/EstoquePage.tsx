import { useState, useEffect, useCallback } from 'react'
import { Plus, Loader2, Package, AlertTriangle } from 'lucide-react'
import { supabase } from '@/lib/supabaseClient'
import type { InventoryItem } from '@/types/database'
import { InventoryCard } from '@/components/estoque/InventoryCard'
import { InventoryMovementModal } from '@/components/estoque/InventoryMovementModal'
import { NewItemModal } from '@/components/estoque/NewItemModal'
import { toast } from 'sonner'
import { Input } from '@/components/ui/Input'

export function EstoquePage() {
  const [items, setItems] = useState<InventoryItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  
  // Modais
  const [isNewItemModalOpen, setIsNewItemModalOpen] = useState(false)
  const [movementItem, setMovementItem] = useState<InventoryItem | null>(null)
  const [movementType, setMovementType] = useState<'in' | 'out' | null>(null)

  const fetchItems = useCallback(async () => {
    setIsLoading(true)
    try {
      let query = supabase
        .from('inventory_items')
        .select('*')
        .order('name', { ascending: true })

      if (searchTerm.length >= 2) {
        query = query.ilike('name', `%${searchTerm}%`)
      }

      const { data, error } = await query
      if (error) throw error
      setItems(data || [])
    } catch (error: any) {
      console.error('Erro ao buscar estoque:', error)
      toast.error('Não foi possível carregar os itens do estoque.')
    } finally {
      setIsLoading(false)
    }
  }, [searchTerm])

  useEffect(() => {
    const delay = setTimeout(fetchItems, 300)
    return () => clearTimeout(delay)
  }, [fetchItems])

  const handleOpenMovement = (item: InventoryItem, type: 'in' | 'out') => {
    setMovementItem(item)
    setMovementType(type)
  }

  const itemsBelowMin = items.filter(i => i.current_quantity < i.min_quantity)

  return (
    <div className="space-y-8 pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Estoque</h1>
        <button
          onClick={() => setIsNewItemModalOpen(true)}
          className="flex items-center justify-center gap-2 h-[52px] px-6 rounded-xl text-[18px] font-bold text-white bg-purple-900 hover:bg-purple-800 transition-colors shadow-md focus-ring"
        >
          <Plus size={24} strokeWidth={2.5} />
          Novo item
        </button>
      </div>

      {itemsBelowMin.length > 0 && !isLoading && (
        <div className="bg-red-50 border-l-4 border-red-500 p-5 rounded-r-xl flex items-start gap-4">
          <AlertTriangle className="text-red-600 mt-1 shrink-0" size={24} />
          <div>
            <h3 className="text-xl font-bold text-red-900">Atenção!</h3>
            <p className="text-[18px] text-red-800 font-medium">
              Você possui <strong>{itemsBelowMin.length}</strong> {itemsBelowMin.length === 1 ? 'item' : 'itens'} com estoque abaixo do mínimo. Verifique a lista abaixo.
            </p>
          </div>
        </div>
      )}

      <div className="max-w-2xl">
        <Input
          label=""
          placeholder="Buscar item de estoque..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4 text-purple-900">
          <Loader2 size={40} className="animate-spin" />
          <p className="text-lg font-medium">Buscando itens...</p>
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center bg-white rounded-2xl border border-gray-200 border-dashed py-20 px-4 text-center">
          <div className="bg-gray-100 p-4 rounded-full text-gray-400 mb-4">
            <Package size={48} />
          </div>
          <h3 className="text-xl font-bold text-gray-800 mb-2">Nenhum item encontrado</h3>
          <p className="text-gray-500 text-lg max-w-md">
            Comece a controlar seus insumos clicando em "Novo item".
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map(item => (
            <InventoryCard
              key={item.id}
              item={item}
              onMovement={handleOpenMovement}
            />
          ))}
        </div>
      )}

      <NewItemModal
        isOpen={isNewItemModalOpen}
        onClose={() => setIsNewItemModalOpen(false)}
        onSuccess={() => {
          setIsNewItemModalOpen(false)
          fetchItems()
        }}
      />

      <InventoryMovementModal
        isOpen={!!movementItem && !!movementType}
        onClose={() => {
          setMovementItem(null)
          setMovementType(null)
        }}
        onSuccess={() => {
          setMovementItem(null)
          setMovementType(null)
          fetchItems()
        }}
        item={movementItem}
        type={movementType}
      />
    </div>
  )
}
