import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://dtlfothixhofvbihsdfl.supabase.co';
const SUPABASE_KEY = 'sb_publishable_tlaIip4zv9tp2Jgq4uoB1Q_yxiZFU1Y';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function run() {
  const email = 'admin@marketing.com';
  const password = 'Asd.qwe.157@#';

  console.log(`Tentando fazer login como ${email}...`);
  
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    console.error('Erro REAL ao fazer login:', error.message);
  } else {
    console.log('Login bem-sucedido! O problema não é a senha.');
    console.log('User ID:', data.user?.id);
    
    // Tentar pegar o perfil
    const { data: profileData, error: profileError } = await supabase
      .from('users_profiles')
      .select('*')
      .eq('id', data.user.id)
      .single();
      
    if (profileError) {
      console.error('Erro ao buscar o perfil:', profileError.message);
    } else {
      console.log('Perfil encontrado:', profileData);
    }
  }
}

run();
