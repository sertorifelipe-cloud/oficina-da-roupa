-- Adiciona colunas de meio de pagamento na comanda para auditoria e controle de fluxo
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS payment_method text CHECK (payment_method IN ('dinheiro','pix','cartao_debito','cartao_credito')),
ADD COLUMN IF NOT EXISTS delivery_payment_method text CHECK (delivery_payment_method IN ('dinheiro','pix','cartao_debito','cartao_credito'));
