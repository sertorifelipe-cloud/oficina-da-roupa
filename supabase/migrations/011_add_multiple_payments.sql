-- =====================================================
-- Oficina da Roupa — Formas de Pagamentos Múltiplas (Loja)
-- Migration: 011_add_multiple_payments.sql
-- =====================================================

ALTER TABLE sales
  ADD COLUMN payment_amount_1 numeric(10,2),
  ADD COLUMN payment_method_2 text check (payment_method_2 in ('dinheiro','pix','cartao_debito','cartao_credito')),
  ADD COLUMN payment_amount_2 numeric(10,2);
