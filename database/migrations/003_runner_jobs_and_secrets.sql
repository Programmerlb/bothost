-- Server-managed records. Do not add browser-user policies to these tables.
-- Required as the target key for the composite bot/owner foreign key below.
alter table public.bots add constraint bots_id_owner_id_key unique (id, owner_id);

create table if not exists public.bot_secrets (
  bot_id uuid primary key references public.bots(id) on delete cascade,
  telegram_token_ciphertext text not null,
  encryption_key_version integer not null default 1,
  updated_at timestamptz not null default now()
);

alter table public.bot_secrets enable row level security;

create table if not exists public.runner_jobs (
  id uuid primary key default gen_random_uuid(),
  bot_id uuid not null references public.bots(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  action text not null check (action in ('deploy', 'start', 'stop', 'restart')),
  status text not null default 'queued'
    check (status in ('queued', 'claimed', 'running', 'succeeded', 'failed', 'cancelled')),
  requested_at timestamptz not null default now(),
  claimed_at timestamptz,
  finished_at timestamptz,
  error_code text,
  constraint runner_jobs_owner_bot_fk
    foreign key (bot_id, owner_id)
    references public.bots(id, owner_id)
    on delete cascade
);

create index if not exists runner_jobs_queue_idx
  on public.runner_jobs(status, requested_at)
  where status = 'queued';

create index if not exists runner_jobs_owner_idx
  on public.runner_jobs(owner_id, requested_at desc);

alter table public.runner_jobs enable row level security;

-- Users may inspect their own job history, but only trusted server code
-- using the Supabase service role should enqueue, claim, or update jobs.
create policy "Owners can view their runner jobs"
  on public.runner_jobs for select
  to authenticated
  using (auth.uid() = owner_id);

-- bot_secrets intentionally has no authenticated-user policies.
-- Encrypt token values in the application before writing them here.
-- Keep the encryption key outside Supabase (for example, runner/server secret storage).
