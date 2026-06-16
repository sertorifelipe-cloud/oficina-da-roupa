-- Adiciona coluna de preço de custo para possibilitar relatórios de margem/lucro
ALTER TABLE inventory_items
ADD COLUMN IF NOT EXISTS cost_price numeric(10,2) DEFAULT 0;
