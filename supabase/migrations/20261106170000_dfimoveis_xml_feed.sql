alter table public.properties
  add column if not exists dfimoveis_type text,
  add column if not exists dfimoveis_subtype text,
  add column if not exists land_area numeric(10, 2) check (land_area >= 0);

alter table public.imovel_integracoes
  drop constraint if exists imovel_integracoes_portal_check;

alter table public.imovel_integracoes
  add constraint imovel_integracoes_portal_check
  check (portal in ('olx', 'wimoveis', 'dfimoveis'));

create table if not exists public.portal_configurations (
  portal text primary key,
  customer_code text not null default '',
  updated_at timestamptz not null default now()
);

alter table public.portal_configurations enable row level security;

create policy "Admins manage portal configurations"
  on public.portal_configurations
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

revoke all on public.portal_configurations from anon, authenticated;
grant select, insert, update, delete on public.portal_configurations to authenticated;
grant select on public.portal_configurations to service_role;

insert into public.portal_configurations (portal)
values ('dfimoveis')
on conflict (portal) do nothing;

notify pgrst, 'reload schema';
