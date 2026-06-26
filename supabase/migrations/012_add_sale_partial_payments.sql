-- Migração para suporte a pagamentos parciais na loja (conta pendurada)
ALTER TABLE sales ADD COLUMN status TEXT DEFAULT 'concluida';
ALTER TABLE sales ADD COLUMN amount_paid NUMERIC;
ALTER TABLE sales ADD COLUMN payment_history JSONB DEFAULT '[]'::jsonb;

-- Inicializar vendas antigas
UPDATE sales SET amount_paid = total, status = 'concluida' WHERE amount_paid IS NULL;
