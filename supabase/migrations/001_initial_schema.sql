-- =====================================================
-- Oficina da Roupa — Schema Completo
-- Migration: 001_initial_schema.sql
-- =====================================================

-- -------------------------------------------------------
-- TABELAS
-- -------------------------------------------------------

create table if not exists users_profiles (
  id uuid references auth.users primary key,
  name text not null,
  role text check (role in ('admin','operador')) default 'operador',
  created_at timestamptz default now()
);

create table if not exists clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text,
  email text,
  notes text,
  created_at timestamptz default now()
);

create table if not exists services (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  base_price numeric(10,2),
  category text check (category in ('costuraria','loja')),
  active boolean default true,
  created_at timestamptz default now()
);

create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  order_number serial,
  client_id uuid references clients(id),
  service_id uuid references services(id),
  description text,
  status text check (status in ('recebido','em_andamento','pronto','entregue')) default 'recebido',
  entry_date date not null default current_date,
  expected_date date,
  delivery_date date,
  price numeric(10,2),
  notes text,
  created_by uuid references users_profiles(id),
  created_at timestamptz default now()
);

create table if not exists sales (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references clients(id),
  client_name_free text,
  items jsonb not null default '[]',
  subtotal numeric(10,2),
  discount numeric(10,2) default 0,
  total numeric(10,2),
  payment_method text check (payment_method in ('dinheiro','pix','cartao_debito','cartao_credito')),
  sale_date timestamptz default now(),
  notes text,
  created_by uuid references users_profiles(id)
);

create table if not exists inventory_items (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text,
  unit text default 'un',
  min_quantity numeric(10,2) default 0,
  current_quantity numeric(10,2) default 0,
  notes text,
  created_at timestamptz default now()
);

create table if not exists inventory_movements (
  id uuid primary key default gen_random_uuid(),
  item_id uuid references inventory_items(id),
  type text check (type in ('entrada','saida','ajuste')),
  quantity numeric(10,2) not null,
  reason text,
  created_by uuid references users_profiles(id),
  created_at timestamptz default now()
);

-- -------------------------------------------------------
-- FUNÇÃO E TRIGGER DE ESTOQUE
-- -------------------------------------------------------

create or replace function update_inventory_quantity()
returns trigger as $$
begin
  if NEW.type = 'entrada' then
    update inventory_items
      set current_quantity = current_quantity + NEW.quantity
      where id = NEW.item_id;
  elsif NEW.type = 'saida' then
    update inventory_items
      set current_quantity = current_quantity - NEW.quantity
      where id = NEW.item_id;
  elsif NEW.type = 'ajuste' then
    update inventory_items
      set current_quantity = NEW.quantity
      where id = NEW.item_id;
  end if;
  return NEW;
end;
$$ language plpgsql;

drop trigger if exists trg_inventory_movement on inventory_movements;

create trigger trg_inventory_movement
  after insert on inventory_movements
  for each row execute function update_inventory_quantity();

-- -------------------------------------------------------
-- ROW LEVEL SECURITY
-- -------------------------------------------------------

alter table users_profiles enable row level security;
alter table clients enable row level security;
alter table services enable row level security;
alter table orders enable row level security;
alter table sales enable row level security;
alter table inventory_items enable row level security;
alter table inventory_movements enable row level security;

-- users_profiles: cada usuário vê apenas o próprio perfil
drop policy if exists "proprio perfil" on users_profiles;
create policy "proprio perfil" on users_profiles
  for all using (auth.uid() = id);

-- demais tabelas: acesso a qualquer usuário autenticado
drop policy if exists "acesso autenticado" on clients;
create policy "acesso autenticado" on clients
  for all using (auth.role() = 'authenticated');

drop policy if exists "acesso autenticado" on services;
create policy "acesso autenticado" on services
  for all using (auth.role() = 'authenticated');

drop policy if exists "acesso autenticado" on orders;
create policy "acesso autenticado" on orders
  for all using (auth.role() = 'authenticated');

drop policy if exists "acesso autenticado" on sales;
create policy "acesso autenticado" on sales
  for all using (auth.role() = 'authenticated');

drop policy if exists "acesso autenticado" on inventory_items;
create policy "acesso autenticado" on inventory_items
  for all using (auth.role() = 'authenticated');

drop policy if exists "acesso autenticado" on inventory_movements;
create policy "acesso autenticado" on inventory_movements
  for all using (auth.role() = 'authenticated');
