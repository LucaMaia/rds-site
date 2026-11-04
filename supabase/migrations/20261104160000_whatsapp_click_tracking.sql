alter table public.property_interactions
  alter column interested_name drop not null,
  alter column interested_email drop not null,
  alter column interested_phone drop not null,
  add column if not exists property_broker_id uuid,
  add column if not exists property_broker_name text,
  add column if not exists interaction_source text not null default 'property_inquiry';

alter table public.property_interactions
  drop constraint if exists property_interactions_interaction_type_check,
  add constraint property_interactions_interaction_type_check
    check (interaction_type in ('contact_received', 'email_sent', 'whatsapp_click', 'visit_requested', 'visit_completed'));

alter table public.property_interactions
  drop constraint if exists property_interactions_interaction_source_check,
  add constraint property_interactions_interaction_source_check
    check (interaction_source in ('property_inquiry', 'public_property_page', 'admin_panel'));

create index if not exists property_interactions_broker_id_idx
  on public.property_interactions (property_broker_id);

notify pgrst, 'reload schema';
