create table public.property_inquiry_rate_limits (
  ip_hash text primary key check (ip_hash ~ '^[0-9a-f]{64}$'),
  window_started_at timestamptz not null default now(),
  request_count integer not null default 1 check (request_count > 0),
  updated_at timestamptz not null default now()
);

alter table public.property_inquiry_rate_limits enable row level security;
revoke all on public.property_inquiry_rate_limits from public, anon, authenticated;
grant all on public.property_inquiry_rate_limits to service_role;

create or replace function public.consume_property_inquiry_rate_limit(
  p_ip_hash text,
  p_limit integer,
  p_window_seconds integer
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_now timestamptz := pg_catalog.clock_timestamp();
  v_request_count integer;
begin
  if p_ip_hash !~ '^[0-9a-f]{64}$'
    or p_limit not between 1 and 20
    or p_window_seconds not between 1 and 86400 then
    raise exception 'Invalid rate limit parameters.';
  end if;

  insert into public.property_inquiry_rate_limits (ip_hash, window_started_at, request_count, updated_at)
  values (p_ip_hash, v_now, 1, v_now)
  on conflict (ip_hash) do update
  set window_started_at = case
        when public.property_inquiry_rate_limits.window_started_at
          <= v_now - pg_catalog.make_interval(secs => p_window_seconds)
          then v_now
        else public.property_inquiry_rate_limits.window_started_at
      end,
      request_count = case
        when public.property_inquiry_rate_limits.window_started_at
          <= v_now - pg_catalog.make_interval(secs => p_window_seconds)
          then 1
        else least(public.property_inquiry_rate_limits.request_count + 1, p_limit + 1)
      end,
      updated_at = v_now
  returning request_count into v_request_count;

  delete from public.property_inquiry_rate_limits
  where ip_hash in (
    select ip_hash
    from public.property_inquiry_rate_limits
    where updated_at < v_now - interval '1 day'
    limit 100
  );

  return v_request_count <= p_limit;
end;
$$;

revoke all on function public.consume_property_inquiry_rate_limit(text, integer, integer) from public, anon, authenticated;
grant execute on function public.consume_property_inquiry_rate_limit(text, integer, integer) to service_role;
