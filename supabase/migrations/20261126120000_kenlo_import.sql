-- Importação de anúncios do Kenlo Imob (Open API v2 / Mundo-K).
-- A Edge Function kenlo-sync lê GET /v2/listings e cria/atualiza imóveis do site.
-- O vínculo fica numa tabela própria para não interferir com imovel_integracoes,
-- que representa a saída do site para os portais.

create table if not exists public.kenlo_listings (
  -- Id do anúncio no Kenlo (texto com prefixo, ex.: OPEN_PROPERTY_84499613).
  listing_id text primary key,
  -- Fica nulo quando o imóvel é excluído no painel: a sincronização então
  -- não o recria, respeitando a exclusão feita pelo administrador.
  property_id uuid unique references public.properties(id) on delete set null,
  property_code text,
  -- Hash do conteúdo importado; o imóvel só é regravado quando ele muda no Kenlo.
  content_hash text,
  kenlo_updated_at timestamptz,
  -- Preenchido quando o anúncio deixa de vir do Kenlo.
  removed_at timestamptz,
  -- Verdadeiro quando foi a sincronização que pausou o imóvel; assim ele só é
  -- republicado automaticamente se voltar ao Kenlo e ninguém tiver mudado o status.
  auto_paused boolean not null default false,
  synced_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists public.kenlo_sync_runs (
  id bigint generated always as identity primary key,
  trigger text not null check (trigger in ('manual', 'cron')),
  status text not null default 'running' check (status in ('running', 'success', 'error')),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  listings_found integer,
  created_count integer not null default 0,
  updated_count integer not null default 0,
  unchanged_count integer not null default 0,
  paused_count integer not null default 0,
  republished_count integer not null default 0,
  skipped_count integer not null default 0,
  error text
);

create index if not exists kenlo_sync_runs_started_idx on public.kenlo_sync_runs (started_at desc);

alter table public.kenlo_listings enable row level security;
alter table public.kenlo_sync_runs enable row level security;

create policy "Admins read Kenlo listings"
  on public.kenlo_listings for select to authenticated using (public.is_admin());
create policy "Admins read Kenlo sync runs"
  on public.kenlo_sync_runs for select to authenticated using (public.is_admin());

-- Escrita somente pela Edge Function (service_role).
revoke all on public.kenlo_listings, public.kenlo_sync_runs from anon, authenticated;
grant select on public.kenlo_listings, public.kenlo_sync_runs to authenticated;
grant select, insert, update, delete on public.kenlo_listings, public.kenlo_sync_runs to service_role;
grant select, insert, update, delete on public.properties, public.property_images, public.property_videos to service_role;
grant select on public.captors to service_role;

notify pgrst, 'reload schema';
