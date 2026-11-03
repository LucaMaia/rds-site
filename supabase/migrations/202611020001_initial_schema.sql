create extension if not exists pgcrypto;

create type public.property_status as enum (
  'CRIADO', 'PUBLICADO', 'PAUSADO', 'STAND_BY', 'VENDIDO', 'ALUGADO', 'CANCELADO'
);
create type public.property_purpose as enum ('VENDA', 'ALUGUEL', 'AMBOS');

create sequence public.property_code_seq start 3;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'admin' check (role in ('admin')),
  full_name text,
  created_at timestamptz not null default now()
);

create table public.captors (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  photo_url text,
  phone text,
  whatsapp text,
  email text,
  description text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.brokers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  photo_url text,
  phone text,
  whatsapp text,
  email text,
  description text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.site_settings (
  id boolean primary key default true check (id),
  company_name text not null default 'RDS Imóveis',
  whatsapp text not null default '',
  contact_email text not null default '',
  instagram_url text not null default '',
  updated_at timestamptz not null default now()
);

create table public.properties (
  id uuid primary key default gen_random_uuid(),
  code text not null unique default ('IMV-' || lpad(nextval('public.property_code_seq')::text, 4, '0')),
  title text not null,
  type text not null,
  purpose public.property_purpose not null default 'VENDA',
  status public.property_status not null default 'CRIADO',
  captor_id uuid references public.captors(id) on delete set null,
  broker_id uuid references public.brokers(id) on delete set null,
  zip_code text,
  state text not null,
  city text not null,
  neighborhood text not null,
  address text,
  number text,
  complement text,
  sale_price numeric(14, 2),
  rent_price numeric(14, 2),
  condo_fee numeric(14, 2),
  property_tax numeric(14, 2),
  tax_frequency text check (tax_frequency in ('MENSAL', 'ANUAL') or tax_frequency is null),
  total_area numeric(10, 2),
  private_area numeric(10, 2),
  bedrooms integer not null default 0,
  suites integer not null default 0,
  bathrooms integer not null default 0,
  parking_spaces integer not null default 0,
  floor integer,
  construction_year integer,
  furnished boolean not null default false,
  financing boolean not null default false,
  trade boolean not null default false,
  features text[] not null default '{}',
  description text not null default '',
  featured boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.property_images (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  url text not null,
  display_order integer not null default 0,
  is_cover boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.property_videos (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  url text not null,
  display_order integer not null default 0
);

create table public.property_links (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  name text not null,
  url text not null,
  image_url text,
  is_public boolean not null default true,
  display_order integer not null default 0
);

create table public.property_status_history (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  from_status public.property_status,
  to_status public.property_status not null,
  changed_by uuid references auth.users(id) on delete set null,
  changed_at timestamptz not null default now()
);

create index properties_status_idx on public.properties(status);
create index properties_location_idx on public.properties(state, city, neighborhood);
create index properties_captor_idx on public.properties(captor_id);
create index properties_created_idx on public.properties(created_at desc);
create index property_images_property_idx on public.property_images(property_id, display_order);

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = 'admin'
  );
$$;

-- create or replace function public.record_property_status_change()
-- returns trigger
-- language plpgsql
-- security definer
-- set search_path = ''
-- as $$
-- begin
--   if tg_op = 'INSERT' or new.status is distinct from old.status then
--     insert into public.property_status_history(property_id, from_status, to_status, changed_by)
--     values (new.id, case when tg_op = 'INSERT' then null else old.status end, new.status, auth.uid());
--   end if;
--   new.updated_at := now();
--   return new;
-- end;
-- $$;

-- create trigger property_status_history_trigger
--   before insert or update on public.properties
--   for each row execute function public.record_property_status_change();

create or replace function public.record_property_status_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT'
     or new.status is distinct from old.status then

    insert into public.property_status_history (
      property_id,
      from_status,
      to_status,
      changed_by
    )
    values (
      new.id,
      case
        when tg_op = 'INSERT' then null
        else old.status
      end,
      new.status,
      auth.uid()
    );

  end if;

  return new;
end;
$$;

create trigger property_status_history_trigger
after insert or update
on public.properties
for each row
execute function public.record_property_status_change();

create or replace function public.update_property_timestamp()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger property_updated_at_trigger
before update
on public.properties
for each row
execute function public.update_property_timestamp();

alter table public.profiles enable row level security;
alter table public.captors enable row level security;
alter table public.brokers enable row level security;
alter table public.site_settings enable row level security;
alter table public.properties enable row level security;
alter table public.property_images enable row level security;
alter table public.property_videos enable row level security;
alter table public.property_links enable row level security;
alter table public.property_status_history enable row level security;

create view public.public_properties with (security_invoker = false) as
select
  id, code, title, type, purpose, status, captor_id, broker_id, state, city, neighborhood,
  sale_price, rent_price, condo_fee, property_tax, tax_frequency, total_area, private_area,
  bedrooms, suites, bathrooms, parking_spaces, floor, construction_year, furnished,
  financing, trade, features, description, featured, created_at
from public.properties
where status = 'PUBLICADO';

create view public.public_captors with (security_invoker = false) as
select id, name, photo_url, phone, whatsapp, active
from public.captors where active = true;

create view public.public_brokers with (security_invoker = false) as
select id, name, photo_url, phone, whatsapp, active
from public.brokers where active = true;

create view public.public_site_settings with (security_invoker = false) as
select id, company_name, whatsapp, contact_email, instagram_url from public.site_settings;

create policy "Admins can view profiles" on public.profiles for select to authenticated using (public.is_admin());
create policy "Admins can manage profiles" on public.profiles for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "Admins manage captors" on public.captors for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "Admins manage brokers" on public.brokers for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "Admins manage settings" on public.site_settings for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "Admins manage properties" on public.properties for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "Admins manage property images" on public.property_images for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "Admins manage property videos" on public.property_videos for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "Admins manage property links" on public.property_links for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "Admins view status history" on public.property_status_history for select to authenticated using (public.is_admin());

create policy "Public can read images of published properties"
  on public.property_images for select to anon, authenticated
  using (exists (select 1 from public.public_properties p where p.id = property_id));
create policy "Public can read videos of published properties"
  on public.property_videos for select to anon, authenticated
  using (exists (select 1 from public.public_properties p where p.id = property_id));
create policy "Public can read visible links of published properties"
  on public.property_links for select to anon, authenticated
  using (is_public and exists (select 1 from public.public_properties p where p.id = property_id));

revoke all on public.properties from anon;
revoke all on public.captors from anon;
revoke all on public.brokers from anon;
revoke all on public.profiles from anon;
revoke all on public.site_settings from anon;
grant select on public.public_properties to anon, authenticated;
grant select on public.public_captors to anon, authenticated;
grant select on public.public_brokers to anon, authenticated;
grant select on public.public_site_settings to anon, authenticated;
grant select on public.property_images, public.property_videos, public.property_links to anon, authenticated;
grant select, insert, update, delete on public.properties, public.captors, public.brokers,
  public.property_images, public.property_videos, public.property_links, public.profiles, public.site_settings,
  public.property_status_history to authenticated;
grant usage, select on sequence public.property_code_seq to authenticated;

insert into public.captors(name) values ('Fábio'), ('Rose'), ('Sérgio'), ('Rosilene')
on conflict do nothing;

with captor as (select id from public.captors where name = 'Fábio' order by created_at limit 1)
insert into public.properties (
  code, title, type, purpose, status, captor_id, state, city, neighborhood,
  sale_price, rent_price, condo_fee, property_tax, tax_frequency, total_area, private_area,
  bedrooms, suites, bathrooms, parking_spaces, features, description, featured
)
select 'IMV-0001', 'Apartamento contemporâneo no Guará II', 'Apartamento', 'AMBOS', 'PUBLICADO',
  captor.id, 'Distrito Federal', 'Brasília', 'Guará II', 650000, 3500, 650, 1200, 'ANUAL',
  110, 110, 3, 1, 2, 2, array['Varanda', 'Armários planejados'],
  'Apartamento contemporâneo, com ambientes amplos, excelente iluminação natural, varanda, acabamento moderno e localização privilegiada no Guará II.', true
from captor
on conflict (code) do nothing;

insert into public.property_images(property_id, url, display_order, is_cover)
select id, 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1400&q=85', 0, true
from public.properties where code = 'IMV-0001'
and not exists (select 1 from public.property_images where property_id = properties.id);
insert into public.property_images(property_id, url, display_order, is_cover)
select id, 'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1400&q=85', 1, false
from public.properties where code = 'IMV-0001'
and not exists (select 1 from public.property_images where property_id = properties.id and display_order = 1);
with captor as (select id from public.captors where name = 'Rose' order by created_at limit 1)
insert into public.properties (
  code, title, type, purpose, status, captor_id, state, city, neighborhood,
  sale_price, total_area, private_area, bedrooms, suites, bathrooms, parking_spaces,
  features, description, featured
)
select 'IMV-0002', 'Casa moderna com área gourmet em Águas Claras', 'Casa', 'VENDA', 'PUBLICADO',
  captor.id, 'Distrito Federal', 'Brasília', 'Águas Claras', 1250000, 220, 220, 4, 2, 4, 3,
  array['Churrasqueira', 'Varanda gourmet'],
  'Casa moderna com projeto arquitetônico sofisticado, ambientes integrados, área gourmet e excelente distribuição dos espaços.', true
from captor
on conflict (code) do nothing;

insert into public.property_images(property_id, url, display_order, is_cover)
select id, 'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1400&q=85', 0, true
from public.properties where code = 'IMV-0002'
and not exists (select 1 from public.property_images where property_id = properties.id);

with demo_properties (
  code, title, type, purpose, captor_name, neighborhood, sale_price, rent_price, condo_fee,
  property_tax, total_area, private_area, bedrooms, suites, bathrooms, parking_spaces,
  features, description, created_at, image_url
) as (
  values
    ('IMV-0003', 'Apartamento com varanda ampla no Sudoeste', 'Apartamento', 'ALUGUEL', 'Sérgio', 'Sudoeste', null, 5200, 890, 1450, 96, 88, 3, 1, 2, 2, array['Varanda', 'Academia', 'Elevador'], 'Apartamento iluminado, com varanda generosa, cozinha integrada e duas vagas cobertas. Em condomínio com lazer e fácil acesso ao Parque da Cidade.', '2026-10-12T12:00:00Z', 'https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?auto=format&fit=crop&w=1400&q=85'),
    ('IMV-0004', 'Cobertura iluminada perto do Parque da Cidade', 'Cobertura', 'VENDA', 'Rosilene', 'Asa Sul', 1850000, null, 1350, 2300, 185, 164, 3, 2, 3, 2, array['Varanda gourmet', 'Churrasqueira', 'Armários planejados'], 'Cobertura com ambientes integrados, terraço privativo e excelente iluminação natural. Uma planta versátil em localização prática na Asa Sul.', '2026-10-11T12:00:00Z', 'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=1400&q=85'),
    ('IMV-0005', 'Casa com jardim e piscina no Lago Sul', 'Casa', 'VENDA', 'Fábio', 'Lago Sul', 3200000, null, null, 4800, 420, 360, 5, 4, 6, 4, array['Piscina', 'Jardim', 'Churrasqueira', 'Varanda gourmet'], 'Residência espaçosa cercada por jardim, com piscina, área gourmet e salas conectadas ao espaço externo. Ideal para aproveitar os dias em família.', '2026-10-10T12:00:00Z', 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1400&q=85'),
    ('IMV-0006', 'Casa contemporânea com varanda no Jardim Botânico', 'Casa', 'AMBOS', 'Rose', 'Jardim Botânico', 1450000, 7800, 620, 1850, 265, 235, 4, 3, 4, 3, array['Varanda', 'Jardim', 'Armários planejados'], 'Casa de linhas contemporâneas em condomínio tranquilo, com espaços integrados, varanda voltada para o jardim e ótima iluminação em todos os ambientes.', '2026-10-09T12:00:00Z', 'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1400&q=85'),
    ('IMV-0007', 'Apartamento prático com lazer em Taguatinga', 'Apartamento', 'ALUGUEL', 'Sérgio', 'Taguatinga Centro', null, 2400, 480, 720, 74, 68, 2, 1, 2, 1, array['Elevador', 'Playground', 'Salão de festas'], 'Apartamento funcional com dois quartos, vaga coberta e área de lazer no condomínio. Próximo a comércio, transporte e serviços da região central de Taguatinga.', '2026-10-08T12:00:00Z', 'https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?auto=format&fit=crop&w=1400&q=85')
)
insert into public.properties (
  code, title, type, purpose, status, captor_id, state, city, neighborhood,
  sale_price, rent_price, condo_fee, property_tax, tax_frequency, total_area, private_area,
  bedrooms, suites, bathrooms, parking_spaces, features, description, featured, created_at
)
select d.code, d.title, d.type, d.purpose::public.property_purpose, 'PUBLICADO',
  c.id, 'Distrito Federal', 'Brasília', d.neighborhood,
  d.sale_price, d.rent_price, d.condo_fee, d.property_tax, 'ANUAL', d.total_area, d.private_area,
  d.bedrooms, d.suites, d.bathrooms, d.parking_spaces, d.features, d.description, true, d.created_at::timestamptz
from demo_properties d
left join public.captors c on c.name = d.captor_name
on conflict (code) do nothing;

with demo_images(code, url) as (
  values
    ('IMV-0003', 'https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?auto=format&fit=crop&w=1400&q=85'),
    ('IMV-0004', 'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=1400&q=85'),
    ('IMV-0005', 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1400&q=85'),
    ('IMV-0006', 'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1400&q=85'),
    ('IMV-0007', 'https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?auto=format&fit=crop&w=1400&q=85')
)
insert into public.property_images(property_id, url, display_order, is_cover)
select p.id, d.url, 0, true
from demo_images d
join public.properties p on p.code = d.code
where not exists (select 1 from public.property_images i where i.property_id = p.id);

insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values ('property-images', 'property-images', true, 12582912, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy "Public reads property images storage"
  on storage.objects for select to anon, authenticated using (bucket_id = 'property-images');
create policy "Admins upload property images"
  on storage.objects for insert to authenticated with check (bucket_id = 'property-images' and public.is_admin());
create policy "Admins update property images"
  on storage.objects for update to authenticated using (bucket_id = 'property-images' and public.is_admin()) with check (bucket_id = 'property-images' and public.is_admin());
create policy "Admins delete property images"
  on storage.objects for delete to authenticated using (bucket_id = 'property-images' and public.is_admin());
