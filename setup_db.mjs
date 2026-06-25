import pkg from 'pg';
const { Client } = pkg;
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const DB_HOST = 'db.dtlfothixhofvbihsdfl.supabase.co';
const DB_PORT = 5432;
const DB_USER = 'postgres';
const DB_PASSWORD = '83ry7ztn.pLXN';
const DB_NAME = 'postgres';

const SUPABASE_URL = 'https://dtlfothixhofvbihsdfl.supabase.co';
const SUPABASE_KEY = 'sb_publishable_tlaIip4zv9tp2Jgq4uoB1Q_yxiZFU1Y';

async function run() {
  const client = new Client({
    host: DB_HOST,
    port: DB_PORT,
    user: DB_USER,
    password: DB_PASSWORD,
    database: DB_NAME,
  });

  try {
    await client.connect();
    console.log('Conectado ao banco de dados.');

    // 1. Executar as migrations (001_initial_schema.sql)
    const sql = fs.readFileSync('./supabase/migrations/001_initial_schema.sql', 'utf8');
    await client.query(sql);
    console.log('Migrations executadas com sucesso.');

    // 2. Criar usuário no Auth (usando cliente GoTrue)
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
    const email = 'admin@marketing.com';
    const password = 'Asd.qwe.157@#';

    console.log(`Criando usuário ${email}...`);
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (signUpError && signUpError.message !== 'User already registered') {
      throw signUpError;
    }

    let userId = signUpData?.user?.id;

    // Se o usuário já existe, pegamos o ID direto do banco
    if (!userId) {
      const res = await client.query('SELECT id FROM auth.users WHERE email = $1', [email]);
      if (res.rows.length > 0) {
        userId = res.rows[0].id;
        console.log('Usuário já existia no auth.users com ID:', userId);
      } else {
        throw new Error('Não foi possível recuperar o ID do usuário criado.');
      }
    } else {
      console.log('Usuário criado no auth.users com ID:', userId);
    }

    // 3. Confirmar o e-mail diretamente no banco (burlar confirmação)
    await client.query(
      'UPDATE auth.users SET email_confirmed_at = now() WHERE id = $1',
      [userId]
    );
    console.log('E-mail confirmado no banco.');

    // 4. Inserir perfil na tabela users_profiles
    const insertProfileQuery = `
      INSERT INTO public.users_profiles (id, name, role) 
      VALUES ($1, $2, $3)
      ON CONFLICT (id) DO UPDATE SET role = $3
    `;
    await client.query(insertProfileQuery, [userId, 'Admin Principal', 'admin']);
    console.log('Perfil de administrador criado em users_profiles.');

  } catch (err) {
    console.error('Erro durante a execução:', err);
  } finally {
    await client.end();
  }
}

run();
