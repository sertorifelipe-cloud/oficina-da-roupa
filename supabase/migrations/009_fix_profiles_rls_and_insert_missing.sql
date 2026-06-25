-- =====================================================
-- Oficina da Roupa — Correção de Políticas RLS para users_profiles
-- Migration: 009_fix_profiles_rls_and_insert_missing.sql
-- =====================================================

-- 1. Remover políticas antigas de UPDATE para evitar duplicidades
DROP POLICY IF EXISTS "user_update_own" ON public.users_profiles;
DROP POLICY IF EXISTS "admin_update_all" ON public.users_profiles;
DROP POLICY IF EXISTS "admin_gerencia_tudo_users" ON public.users_profiles;

-- 2. Criar política de inserção de perfil próprio por usuários autenticados
DROP POLICY IF EXISTS "users_insert_own" ON public.users_profiles;
CREATE POLICY "users_insert_own" ON public.users_profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- 3. Criar política de atualização de perfil próprio pelo usuário correspondente
DROP POLICY IF EXISTS "users_update_own" ON public.users_profiles;
CREATE POLICY "users_update_own" ON public.users_profiles
  FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- 4. Criar política que permite ao administrador atualizar qualquer perfil
DROP POLICY IF EXISTS "admin_update_all" ON public.users_profiles;
CREATE POLICY "admin_update_all" ON public.users_profiles
  FOR UPDATE USING (
    (SELECT role FROM public.users_profiles WHERE id = auth.uid()) = 'admin'
  );
