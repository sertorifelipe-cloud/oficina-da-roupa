import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://dtlfothixhofvbihsdfl.supabase.co';
const SUPABASE_KEY = 'sb_publishable_tlaIip4zv9tp2Jgq4uoB1Q_yxiZFU1Y';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function run() {
  const email = 'admin@nestx.com';
  const password = 'Asd.qwe.157@#';

  console.log(`Criando o usuário ${email}...`);
  
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });

  if (error) {
    console.error('Erro ao criar usuário:', error.message);
    return;
  }

  console.log('Usuário criado!');
  console.log('ID:', data.user?.id);
  
  // Tentar fazer login para testar
  console.log('Testando login...');
  const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
    email,
    password
  });
  
  if (loginError) {
    console.log('Erro ao fazer login:', loginError.message);
  } else {
    console.log('Login bem-sucedido! O e-mail não pediu confirmação.');
    
    // Tentar criar o perfil de admin
    if (loginData.user?.id) {
       const { error: profileError } = await supabase
         .from('users_profiles')
         .insert([{ id: loginData.user.id, name: 'Admin Nestx', role: 'admin' }]);
         
       if (profileError) {
         console.log('ALERTA: O usuário pode logar, mas o perfil não foi salvo no banco.');
         console.log('Motivo:', profileError.message);
         console.log('Isso acontece porque as tabelas do banco ainda não foram criadas.');
       } else {
         console.log('Perfil Admin criado com sucesso na tabela users_profiles!');
       }
    }
  }
}

run();
