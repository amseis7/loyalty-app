-- Enable UUID generation
create extension if not exists "pgcrypto";

-- Customers table
create table customers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text not null unique,
  card_token text not null unique default encode(gen_random_bytes(12), 'hex'),
  created_at timestamptz not null default now()
);

-- Stamps table (one row per stamp awarded)
create table stamps (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customers(id) on delete cascade,
  added_by text not null,
  created_at timestamptz not null default now()
);

-- Redemptions table (one row per reward redeemed)
create table redemptions (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customers(id) on delete cascade,
  redeemed_by text not null,
  redeemed_at timestamptz not null default now()
);

-- Row Level Security: allow authenticated users full access (staff panel)
alter table customers enable row level security;
alter table stamps enable row level security;
alter table redemptions enable row level security;

create policy "Authenticated staff can read customers"
  on customers for select to authenticated using (true);

create policy "Authenticated staff can insert customers"
  on customers for insert to authenticated with check (true);

create policy "Authenticated staff can read stamps"
  on stamps for select to authenticated using (true);

create policy "Authenticated staff can insert stamps"
  on stamps for insert to authenticated with check (true);

create policy "Authenticated staff can read redemptions"
  on redemptions for select to authenticated using (true);

create policy "Authenticated staff can insert redemptions"
  on redemptions for insert to authenticated with check (true);

-- Public read for customer card (by token — no auth required)
create policy "Public can read own customer by token"
  on customers for select to anon
  using (true);

create policy "Public can read stamps for card view"
  on stamps for select to anon
  using (true);

create policy "Public can read redemptions for card view"
  on redemptions for select to anon
  using (true);
