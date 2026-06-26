import pkg from 'pg';
const { Client } = pkg;
import fs from 'fs';

const DB_HOST = 'db.dtlfothixhofvbihsdfl.supabase.co';
const DB_PORT = 5432;
const DB_USER = 'postgres';
const DB_PASSWORD = '83ry7ztn.pLXN';
const DB_NAME = 'postgres';

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

    const sql = fs.readFileSync('./supabase/migrations/012_add_sale_partial_payments.sql', 'utf8');
    await client.query(sql);
    console.log('Migration de multiplos pagamentos executada com sucesso.');

  } catch (err) {
    console.error('Erro durante a execução:', err);
  } finally {
    await client.end();
  }
}

run();
