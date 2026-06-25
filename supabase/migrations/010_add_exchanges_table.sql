-- =====================================================
-- Oficina da Roupa — Tabela de Trocas
-- Migration: 010_add_exchanges_table.sql
-- =====================================================

CREATE TABLE IF NOT EXISTS exchanges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id UUID REFERENCES sales(id) NOT NULL,
  exchange_date TIMESTAMPTZ DEFAULT now(),
  -- item devolvido
  returned_item_id UUID REFERENCES inventory_items(id),
  returned_item_name TEXT NOT NULL,
  returned_quantity NUMERIC(10,2) NOT NULL DEFAULT 1,
  -- novo item entregue
  new_item_id UUID REFERENCES inventory_items(id),
  new_item_name TEXT NOT NULL,
  new_quantity NUMERIC(10,2) NOT NULL DEFAULT 1,
  -- diferença de valor (positivo = cliente paga mais, negativo = loja devolve)
  price_difference NUMERIC(10,2) DEFAULT 0,
  reason TEXT,
  created_by UUID REFERENCES users_profiles(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE exchanges ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "acesso autenticado" ON exchanges;
CREATE POLICY "acesso autenticado" ON exchanges
  FOR ALL USING (auth.role() = 'authenticated');
