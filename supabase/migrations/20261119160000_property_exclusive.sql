-- Exclusividade: quando marcada, só a RDS pode anunciar o imóvel.
-- Desmarcada (padrão), nada é exibido e outras imobiliárias podem anunciar.
alter table public.properties
  add column if not exists exclusive boolean not null default false;

create or replace view public.public_properties with (security_invoker = false) as
select
  id, code, title, type, purpose, status, captor_id, broker_id, state, city, neighborhood,
  sale_price, rent_price, condo_fee, property_tax, tax_frequency, total_area, private_area,
  bedrooms, suites, bathrooms, parking_spaces, floor, construction_year, furnished,
  financing, trade, features, description, featured, created_at,
  owner_name, owner_phone, living_rooms, social_balcony, infrastructure, service_areas,
  leisure_areas, intimate_features, closets, floor_types,
  show_watermark, watermark_position, watermark_transparency,
  exclusive
from public.properties
where status = 'PUBLICADO';

notify pgrst, 'reload schema';
