import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://dtlfothixhofvbihsdfl.supabase.co';

// ⚠️ Cole aqui sua service_role key (Settings → API no painel do Supabase)
const SERVICE_ROLE_KEY = 'COLE_SUA_SERVICE_ROLE_KEY_AQUI';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

const NOVA_SENHA = 'Teste123';

const usuarios = [
  'admin@nestx.com',
  'felipe@gmail.com',
];

async function resetarSenhas() {
  // Busca todos os usuários da conta
  const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();

  if (listError) {
    console.error('❌ Erro ao listar usuários:', listError.message);
    console.error('   Verifique se a SERVICE_ROLE_KEY está correta.');
    return;
  }

  for (const email of usuarios) {
    const user = users.find(u => u.email === email);

    if (!user) {
      console.warn(`⚠️  Usuário não encontrado: ${email}`);
      continue;
    }

    const { error } = await supabase.auth.admin.updateUserById(user.id, {
      password: NOVA_SENHA,
    });

    if (error) {
      console.error(`❌ Erro ao atualizar ${email}:`, error.message);
    } else {
      console.log(`✅ Senha atualizada com sucesso: ${email} → ${NOVA_SENHA}`);
    }
  }
}

resetarSenhas();
