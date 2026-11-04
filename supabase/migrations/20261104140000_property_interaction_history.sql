create table public.property_interactions (
  id uuid primary key default gen_random_uuid(),
  property_id uuid references public.properties(id) on delete set null,
  property_code text not null,
  property_title text not null,
  property_neighborhood text not null,
  property_city text not null,
  property_state text not null,
  property_type text not null,
  property_purpose public.property_purpose not null,
  property_status public.property_status not null,
  property_captor_id uuid,
  property_captor_name text,
  property_created_at timestamptz not null,
  interested_name text not null,
  interested_email text not null,
  interested_phone text not null,
  interaction_type text not null check (
    interaction_type in ('contact_received', 'email_sent', 'visit_requested', 'visit_completed')
  ),
  occurred_at timestamptz not null default now(),
  status text,
  created_at timestamptz not null default now()
);

create index property_interactions_occurred_at_idx
  on public.property_interactions (occurred_at desc);
create index property_interactions_property_id_idx
  on public.property_interactions (property_id);
create index property_interactions_type_idx
  on public.property_interactions (interaction_type);
create index property_interactions_region_idx
  on public.property_interactions (property_neighborhood, property_city, property_state);

alter table public.property_interactions enable row level security;
revoke all on public.property_interactions from public, anon, authenticated;
grant select, insert on public.property_interactions to authenticated;
grant all on public.property_interactions to service_role;

create policy "Admins can view property interactions"
  on public.property_interactions
  for select
  to authenticated
  using (public.is_admin());

create policy "Admins can register property visits"
  on public.property_interactions
  for insert
  to authenticated
  with check (
    public.is_admin()
    and interaction_type in ('visit_requested', 'visit_completed')
  );
