-- Run this in Supabase: Project > SQL Editor > New query > paste and Run
-- Adds portfolio holdings tracking. Safe to run even though transactions/budgets already exist.

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
