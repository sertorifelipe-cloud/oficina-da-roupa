-- Adiciona coluna de preço base para possibilitar a venda pela Loja
ALTER TABLE inventory_items
ADD COLUMN base_price numeric(10,2) DEFAULT 0;

-- Atualiza serviços que eram da categoria 'loja' para 'costuraria' para unificar o sistema
UPDATE services
SET category = 'costuraria'
WHERE category = 'loja';
