// =====================================================
// Tipos TypeScript baseados no schema do Supabase
// =====================================================

export type UserRole = 'admin' | 'operador' | 'vendedor' | 'costureiro'

export interface UserProfile {
  id: string
  name: string
  role: UserRole
  created_at: string
}

export interface Client {
  id: string
  name: string
  phone: string | null
  email: string | null
  notes: string | null
  created_at: string
}

export type ServiceCategory = 'costuraria' | 'loja'

export interface Service {
  id: string
  name: string
  description: string | null
  base_price: number | null
  category: ServiceCategory | null
  active: boolean
  created_at: string
}

export type OrderStatus = 'recebido' | 'em_andamento' | 'pronto' | 'entregue'

export interface ServiceItem {
  service_id: string
  description: string
  price: number
}

export interface Order {
  id: string
  order_number: number
  client_id: string
  service_id?: string // Mantido para compatibilidade, mas o foco será services_items
  services_items: ServiceItem[]
  description: string
  status: OrderStatus
  entry_date: string
  expected_date: string
  delivery_date?: string
  price: number
  notes?: string
  created_by: string
  created_at: string
  // relações opcionais (quando feito join)
  client?: Client
  service?: Service
}

export type PaymentMethod = 'dinheiro' | 'pix' | 'cartao_debito' | 'cartao_credito'

export interface SaleItem {
  id: string // ID do item no estoque
  name: string
  quantity: number
  unit_price: number
  total: number
}

export interface Sale {
  id: string
  client_id: string | null
  client_name_free: string | null
  items: SaleItem[]
  subtotal: number | null
  discount: number
  total: number | null
  payment_method: PaymentMethod | null
  sale_date: string
  notes: string | null
  created_by: string | null
  // relações opcionais
  client?: Client
}

export interface InventoryItem {
  id: string
  name: string
  category: string | null
  unit: string
  min_quantity: number
  current_quantity: number
  base_price: number // NOVO
  notes: string | null
  created_at: string
}

export type MovementType = 'entrada' | 'saida' | 'ajuste'

export interface InventoryMovement {
  id: string
  item_id: string | null
  type: MovementType
  quantity: number
  reason: string | null
  created_by: string | null
  created_at: string
  // relações opcionais
  item?: InventoryItem
}
