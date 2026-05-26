import { ArrowDownToLine, ArrowUpFromLine, AlertTriangle } from 'lucide-react'
import type { InventoryItem } from '@/types/database'

interface InventoryCardProps {
  item: InventoryItem
  onMovement: (item: InventoryItem, type: 'in' | 'out') => void
}

export function InventoryCard({ item, onMovement }: InventoryCardProps) {
  const isLowStock = item.current_quantity < item.min_quantity

  // Calcula a porcentagem para a barra de progresso visual (max 100%)
  const percentage = item.min_quantity > 0 
    ? Math.min(100, (item.current_quantity / (item.min_quantity * 2)) * 100)
    : 100

  return (
    <div className={`rounded-2xl shadow-sm border overflow-hidden hover:shadow-md transition-shadow flex flex-col ${isLowStock ? 'bg-red-50/30 border-red-200' : 'bg-white border-gray-200'}`}>
      <div className="p-6 flex-1">
        <div className="flex items-start justify-between mb-4">
          <h3 className="text-[18px] font-bold text-gray-900 leading-tight pr-4">
            {item.name}
          </h3>
          {isLowStock && (
            <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-bold bg-red-100 text-red-800 shrink-0">
              <AlertTriangle size={16} />
              Estoque baixo
            </span>
          )}
        </div>

        <div className="flex items-baseline gap-2 mb-6">
          <span className={`text-4xl font-black ${isLowStock ? 'text-red-600' : 'text-gray-800'}`}>
            {item.current_quantity}
          </span>
          <span className="text-xl font-bold text-gray-500">{item.unit}</span>
        </div>

        {/* Barra de Progresso Visual */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm font-medium text-gray-500">
            <span>Mínimo: {item.min_quantity} {item.unit}</span>
          </div>
          <div className="h-3 w-full bg-gray-200 rounded-full overflow-hidden">
            <div 
              className={`h-full transition-all duration-500 ${isLowStock ? 'bg-red-500' : 'bg-green-500'}`}
              style={{ width: `${percentage}%` }}
            />
          </div>
        </div>
      </div>

      <div className="flex border-t border-gray-100">
        <button
          onClick={() => onMovement(item, 'in')}
          className="flex-1 flex items-center justify-center gap-2 h-[60px] text-[16px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition-colors focus-ring border-r border-gray-100"
        >
          <ArrowDownToLine size={20} />
          Entrada
        </button>
        
        <button
          onClick={() => onMovement(item, 'out')}
          className="flex-1 flex items-center justify-center gap-2 h-[60px] text-[16px] font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 transition-colors focus-ring"
        >
          <ArrowUpFromLine size={20} />
          Saída
        </button>
      </div>
    </div>
  )
}
