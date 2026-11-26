-- Fotos hospedadas no próprio site (bucket property-images).
-- A Edge Function kenlo-images-copy baixa as fotos que ainda apontam para fora
-- (Kenlo / Google) e troca a url pela cópia no Storage. source_url guarda o
-- endereço de origem, para a sincronização do Kenlo reaproveitar a cópia em vez
-- de voltar a apontar para o Kenlo.

alter table public.property_images
  add column if not exists source_url text;

create index if not exists property_images_source_url_idx
  on public.property_images (property_id, source_url)
  where source_url is not null;

notify pgrst, 'reload schema';
