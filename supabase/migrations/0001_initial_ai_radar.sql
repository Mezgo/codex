create extension if not exists pgcrypto;

create table if not exists public.daily_runs (
  id uuid primary key default gen_random_uuid(),
  run_date date not null,
  prompt text not null,
  language text not null default 'es',
  topics text[] not null default '{}',
  generated_at timestamptz not null,
  source_mode text not null default 'manual',
  created_at timestamptz not null default now(),
  unique (run_date, prompt)
);

create table if not exists public.signals (
  id text primary key,
  run_id uuid not null references public.daily_runs(id) on delete cascade,
  title text not null,
  source_name text not null,
  source_url text not null,
  published_at date not null,
  evidence text not null,
  impact_level text not null check (impact_level in ('low', 'medium', 'medium-high', 'high', 'critical')),
  impact_summary text not null,
  action text not null,
  status text not null check (status in ('active', 'monitor', 'investigating', 'open-opportunity', 'pending-litigation')),
  tags text[] not null default '{}',
  payload jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.signal_sources (
  id uuid primary key default gen_random_uuid(),
  signal_id text not null references public.signals(id) on delete cascade,
  name text not null,
  url text not null,
  source_type text not null check (source_type in ('primary', 'secondary', 'community', 'technical')),
  published_at date,
  note text,
  created_at timestamptz not null default now(),
  unique (signal_id, url)
);

create table if not exists public.source_catalog (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  url text not null unique,
  agent_type text not null check (agent_type in ('fuente_oficial', 'repo_tecnico', 'comunidad', 'medio_secundario')),
  priority integer not null,
  status text not null default 'Done',
  active boolean not null default true,
  origin text not null default 'notion',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists daily_runs_run_date_idx on public.daily_runs (run_date desc);
create index if not exists signals_run_id_idx on public.signals (run_id);
create index if not exists signals_impact_level_idx on public.signals (impact_level);
create index if not exists signals_published_at_idx on public.signals (published_at desc);
create index if not exists signal_sources_signal_id_idx on public.signal_sources (signal_id);
create index if not exists source_catalog_agent_type_idx on public.source_catalog (agent_type);
create index if not exists source_catalog_active_idx on public.source_catalog (active);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_signals_updated_at on public.signals;
create trigger set_signals_updated_at
before update on public.signals
for each row
execute function public.set_updated_at();

drop trigger if exists set_source_catalog_updated_at on public.source_catalog;
create trigger set_source_catalog_updated_at
before update on public.source_catalog
for each row
execute function public.set_updated_at();

alter table public.daily_runs enable row level security;
alter table public.signals enable row level security;
alter table public.signal_sources enable row level security;
alter table public.source_catalog enable row level security;

grant usage on schema public to service_role;
revoke all privileges on table public.daily_runs from anon, authenticated;
revoke all privileges on table public.signals from anon, authenticated;
revoke all privileges on table public.signal_sources from anon, authenticated;
revoke all privileges on table public.source_catalog from anon, authenticated;
grant all privileges on table public.daily_runs to service_role;
grant all privileges on table public.signals to service_role;
grant all privileges on table public.signal_sources to service_role;
grant all privileges on table public.source_catalog to service_role;
