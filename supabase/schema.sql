-- Run this in Supabase: Project > SQL Editor > New query > paste and Run

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  amount numeric not null,
  type text not null check (type in ('income', 'expense')),
  category text not null,
  note text,
  occurred_at date not null default current_date,
  created_at timestamptz not null default now()
);

alter table public.transactions enable row level security;

create policy "Users can view their own transactions"
  on public.transactions for select
  using (auth.uid() = user_id);

create policy "Users can insert their own transactions"
  on public.transactions for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own transactions"
  on public.transactions for update
  using (auth.uid() = user_id);

create policy "Users can delete their own transactions"
  on public.transactions for delete
  using (auth.uid() = user_id);

create table if not exists public.budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  category text not null,
  monthly_limit numeric not null,
  created_at timestamptz not null default now(),
  unique (user_id, category)
);

alter table public.budgets enable row level security;

create policy "Users can manage their own budgets"
  on public.budgets for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create table if not exists public.holdings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  display_symbol text not null,   -- e.g. "RELIANCE" — shown in the UI
  yahoo_symbol text not null,     -- e.g. "RELIANCE.NS" — used to fetch live quotes
  company_name text not null,
  quantity numeric not null check (quantity > 0),
  buy_price numeric not null check (buy_price > 0), -- price per share at purchase
  created_at timestamptz not null default now()
);

alter table public.holdings enable row level security;

create policy "Users can manage their own holdings"
  on public.holdings for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
