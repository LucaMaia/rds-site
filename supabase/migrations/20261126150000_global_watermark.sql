-- Marca d'água da RDS em todas as fotografias, de qualquer origem.
-- Padrão único: canto inferior direito, 30% de opacidade (transparência 70).
-- O site já aplica esse padrão independentemente destas colunas; a migration
-- mantém o banco coerente e garante o padrão em inserções diretas
-- (importação do Kenlo, duplicação, SQL).

alter table public.properties
  alter column show_watermark set default true,
  alter column watermark_position set default 'bottom_right',
  alter column watermark_transparency set default 70;

update public.properties
set show_watermark = true,
    watermark_position = 'bottom_right',
    watermark_transparency = 70
where show_watermark is distinct from true
   or watermark_position is distinct from 'bottom_right'
   or watermark_transparency is distinct from 70;

notify pgrst, 'reload schema';
