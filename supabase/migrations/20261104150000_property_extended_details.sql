alter table public.properties
  add column owner_name text,
  add column owner_phone text,
  add column living_rooms integer check (living_rooms >= 0),
  add column social_balcony boolean not null default false,
  add column infrastructure text[] not null default '{}',
  add column service_areas text[] not null default '{}',
  add column leisure_areas text[] not null default '{}',
  add column intimate_features text[] not null default '{}',
  add column closets text[] not null default '{}',
  add column floor_types text[] not null default '{}';

update public.properties
set infrastructure = array_append(infrastructure, 'Mobiliado')
where furnished and not ('Mobiliado' = any(infrastructure));

create or replace view public.public_properties with (security_invoker = false) as
select
  id, code, title, type, purpose, status, captor_id, broker_id, state, city, neighborhood,
  sale_price, rent_price, condo_fee, property_tax, tax_frequency, total_area, private_area,
  bedrooms, suites, bathrooms, parking_spaces, floor, construction_year, furnished,
  financing, trade, features, description, featured, created_at,
  owner_name, owner_phone, living_rooms, social_balcony, infrastructure, service_areas,
  leisure_areas, intimate_features, closets, floor_types
from public.properties
where status = 'PUBLICADO';

notify pgrst, 'reload schema';
