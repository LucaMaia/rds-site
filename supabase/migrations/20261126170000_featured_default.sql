-- Imóveis entram destacados na página inicial por padrão (o administrador
-- pode desmarcar "Destacar na página inicial" no editor).
-- A sincronização do Kenlo só define featured ao criar o imóvel; as
-- atualizações seguintes não sobrescrevem a escolha do administrador.

alter table public.properties
  alter column featured set default true;

-- Destaca os imóveis que já vieram do Kenlo.
update public.properties p
set featured = true
from public.kenlo_listings k
where k.property_id = p.id
  and p.featured is distinct from true;

notify pgrst, 'reload schema';
