alter table public.imovel_integracoes
  add column if not exists nivel_destaque text not null default 'basico';

alter table public.imovel_integracoes
  drop constraint if exists imovel_integracoes_nivel_destaque_check;

alter table public.imovel_integracoes
  add constraint imovel_integracoes_nivel_destaque_check
  check (nivel_destaque in ('basico', 'destaque', 'super_destaque'));

notify pgrst, 'reload schema';
