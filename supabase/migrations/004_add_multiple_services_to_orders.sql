-- Adiciona coluna de itens para suportar múltiplos serviços no mesmo pedido
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS services_items jsonb DEFAULT '[]';

-- Migração de dados: Se já existem pedidos com service_id, movemos para o novo formato
UPDATE orders
SET services_items = jsonb_build_array(
  jsonb_build_object(
    'service_id', service_id,
    'description', description,
    'price', price
  )
)
WHERE service_id IS NOT NULL AND (services_items IS NULL OR services_items = '[]'::jsonb);
