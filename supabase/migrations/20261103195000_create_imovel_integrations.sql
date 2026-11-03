create table public.imovel_integracoes (
  id uuid primary key default gen_random_uuid(),
  imovel_id uuid not null references public.properties(id) on delete cascade,
  portal text not null check (portal in ('olx', 'wimoveis')),
  ativo boolean not null default true,
  codigo_externo text,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  constraint imovel_integracoes_imovel_portal_key unique (imovel_id, portal)
);

create index imovel_integracoes_ativas_portal_idx
  on public.imovel_integracoes (portal, imovel_id)
  where ativo = true;

create or replace function public.update_imovel_integracoes_timestamp()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.atualizado_em := now();
  return new;
end;
$$;

create trigger imovel_integracoes_updated_at_trigger
before update on public.imovel_integracoes
for each row
execute function public.update_imovel_integracoes_timestamp();

alter table public.imovel_integracoes enable row level security;

create policy "Admins manage property integrations"
  on public.imovel_integracoes
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

revoke all on public.imovel_integracoes from anon, authenticated;
grant select, insert, update, delete on public.imovel_integracoes to authenticated;
grant select on public.imovel_integracoes to service_role;
