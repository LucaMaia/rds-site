-- Marca d'água da RDS nas fotografias, configurada por imóvel.
-- A logo é aplicada só visualmente pelo site; os arquivos do Storage não são alterados.
-- Imóveis existentes ficam sem marca d'água (show_watermark = false).

alter table public.properties
  add column if not exists show_watermark boolean not null default false,
  add column if not exists watermark_position text not null default 'bottom_right',
  add column if not exists watermark_transparency smallint not null default 30;

alter table public.properties
  drop constraint if exists properties_watermark_position_check,
  add constraint properties_watermark_position_check
    check (watermark_position in ('top_left', 'top_right', 'center', 'bottom_left', 'bottom_right')),
  drop constraint if exists properties_watermark_transparency_check,
  add constraint properties_watermark_transparency_check
    check (watermark_transparency between 0 and 100);

-- A vista pública passa a expor as três configurações (colunas acrescentadas ao final).
create or replace view public.public_properties with (security_invoker = false) as
select
  id, code, title, type, purpose, status, captor_id, broker_id, state, city, neighborhood,
  sale_price, rent_price, condo_fee, property_tax, tax_frequency, total_area, private_area,
  bedrooms, suites, bathrooms, parking_spaces, floor, construction_year, furnished,
  financing, trade, features, description, featured, created_at,
  owner_name, owner_phone, living_rooms, social_balcony, infrastructure, service_areas,
  leisure_areas, intimate_features, closets, floor_types,
  show_watermark, watermark_position, watermark_transparency
from public.properties
where status = 'PUBLICADO';

notify pgrst, 'reload schema';
