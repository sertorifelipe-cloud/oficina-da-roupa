-- =====================================================
-- Oficina da Roupa — Adicionar status 'cancelado' a orders
-- Migration: 008_add_cancelled_status_to_orders.sql
-- =====================================================

ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_status_check;

ALTER TABLE public.orders ADD CONSTRAINT orders_status_check CHECK (status IN ('recebido', 'em_andamento', 'pronto', 'entregue', 'cancelado'));
