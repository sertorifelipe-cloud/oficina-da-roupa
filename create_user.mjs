import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://dtlfothixhofvbihsdfl.supabase.co';
const SUPABASE_KEY = 'sb_publishable_tlaIip4zv9tp2Jgq4uoB1Q_yxiZFU1Y';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function run() {
  const email = 'admin@marketing.com';
  const password = 'Asd.qwe.157@#';

  console.log(`Tentando criar o usuário ${email}...`);
  
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });

  if (error) {
    console.error('Erro ao criar usuário:', error.message);
    return;
  }

  console.log('Usuário criado com sucesso!');
  console.log('ID:', data.user?.id);
  console.log('Importante: Se o Supabase exigir confirmação de e-mail por padrão, o login não funcionará até confirmar.');
  
  // Tentar fazer login imediatamente
  const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
    email,
    password
  });
  
  if (loginError) {
    console.log('Erro ao fazer login:', loginError.message);
  } else {
    console.log('Login automático funcionou! E-mail confirmation está desativado.');
    
    // Agora tenta inserir o profile
    if (loginData.user?.id) {
       const { error: profileError } = await supabase
         .from('users_profiles')
         .insert([{ id: loginData.user.id, name: 'Admin', role: 'admin' }]);
         
       if (profileError) {
         console.log('A tabela users_profiles pode não existir ainda:', profileError.message);
       } else {
         console.log('Perfil Admin criado com sucesso!');
       }
    }
  }
}

run();
