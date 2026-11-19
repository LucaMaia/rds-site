-- Imóveis cadastrados antes da marca d'água passam a exibir a logo
-- no canto inferior direito (transparência padrão de 30%).
update public.properties
set show_watermark = true,
    watermark_position = 'bottom_right'
where created_at < '2026-11-19 15:00:00+00'
  and show_watermark = false;
