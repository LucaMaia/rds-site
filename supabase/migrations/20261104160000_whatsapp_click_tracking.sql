alter table public.property_interactions
  alter column interested_name drop not null,
  alter column interested_email drop not null,
  alter column interested_phone drop not null,
  add column property_broker_id uuid,
  add column property_broker_name text,
  add column interaction_source text not null default 'property_inquiry'
    check (interaction_source in ('property_inquiry', 'public_property_page', 'admin_panel'));

alter table public.property_interactions
  drop constraint property_interactions_interaction_type_check,
  add constraint property_interactions_interaction_type_check
    check (interaction_type in ('contact_received', 'email_sent', 'whatsapp_click', 'visit_requested', 'visit_completed'));

create index property_interactions_broker_id_idx
  on public.property_interactions (property_broker_id);

notify pgrst, 'reload schema';
