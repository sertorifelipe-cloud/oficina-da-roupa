import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://dtlfothixhofvbihsdfl.supabase.co';
const SUPABASE_KEY = 'sb_publishable_tlaIip4zv9tp2Jgq4uoB1Q_yxiZFU1Y';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function run() {
  const email = 'admin@nestx.com';
  const password = 'Asd.qwe.157@#';

  console.log('Fazendo login...');
  const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
    email,
    password
  });
  
  if (loginError) {
    console.log('Erro ao fazer login:', loginError.message);
  } else {
    console.log('Login bem-sucedido!');
    
    if (loginData.user?.id) {
       console.log('Inserindo perfil de Admin...');
       const { error: profileError } = await supabase
         .from('users_profiles')
         .upsert([{ id: loginData.user.id, name: 'Admin Nestx', role: 'admin' }]);
         
       if (profileError) {
         console.error('Erro ao inserir perfil:', profileError.message);
       } else {
         console.log('Perfil Admin criado/atualizado com sucesso na tabela users_profiles!');
       }
    }
  }
}

run();
