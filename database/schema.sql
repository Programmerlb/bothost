-- Initial Supabase schema for Bothost.
create extension if not exists pgcrypto;

create table if not exists public.bots (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  status text not null default 'stopped'
    check (status in ('stopped', 'starting', 'running', 'stopping', 'failed')),
  runner_id text,
  entrypoint text not null default 'main.py',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists bots_owner_id_idx on public.bots(owner_id);

alter table public.bots enable row level security;

create policy "Owners can view their bots"
  on public.bots for select
  using (auth.uid() = owner_id);

create policy "Owners can create their bots"
  on public.bots for insert
  with check (auth.uid() = owner_id);

create policy "Owners can update their bots"
  on public.bots for update
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

create policy "Owners can delete their bots"
  on public.bots for delete
  using (auth.uid() = owner_id);

-- Do not store Telegram tokens in this browser-readable table.
-- Keep secrets in a server-only encrypted store or dedicated secrets manager.
