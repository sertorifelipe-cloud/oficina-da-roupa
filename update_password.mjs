import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://dtlfothixhofvbihsdfl.supabase.co';
const SUPABASE_KEY = 'sb_publishable_tlaIip4zv9tp2Jgq4uoB1Q_yxiZFU1Y';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function run() {
  const email = 'admin@nestx.com';
  const oldPassword = 'Asd.qwe.157@#'; // Senha que estava no create_user_nestx.mjs
  const newPassword = 'Asd.qwe.157';

  console.log(`Fazendo login com ${email}...`);
  
  const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
    email,
    password: oldPassword
  });

  if (loginError) {
    console.error('Erro ao fazer login. Tente com outra senha.', loginError.message);
    return;
  }

  console.log('Login bem-sucedido. Atualizando a senha...');

  const { data, error } = await supabase.auth.updateUser({
    password: newPassword
  });

  if (error) {
    console.error('Erro ao atualizar a senha:', error.message);
  } else {
    console.log('Senha atualizada com sucesso para Asd.qwe.157!');
  }
}

run();
