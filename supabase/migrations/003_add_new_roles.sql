-- 1. Atualiza a restrição de roles para aceitar os novos cargos
ALTER TABLE users_profiles 
DROP CONSTRAINT IF EXISTS users_profiles_role_check;

ALTER TABLE users_profiles 
ADD CONSTRAINT users_profiles_role_check 
CHECK (role IN ('admin', 'operador', 'vendedor', 'costureiro'));

-- 2. Atualiza a política de segurança (RLS) para permitir que Admin gerencie perfis
DROP POLICY IF EXISTS "proprio perfil" ON users_profiles;
DROP POLICY IF EXISTS "admin_ve_todos_operador_ve_si" ON users_profiles;

CREATE POLICY "admin_gerencia_tudo_users" ON users_profiles
  FOR ALL USING (
    (SELECT role FROM users_profiles WHERE id = auth.uid()) = 'admin'
    OR 
    auth.uid() = id
  );
