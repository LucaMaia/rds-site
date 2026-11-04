create or replace function public.move_team_member(
  p_from_kind text,
  p_to_kind text,
  p_member_id uuid,
  p_name text,
  p_photo_url text,
  p_phone text,
  p_whatsapp text,
  p_email text,
  p_description text,
  p_active boolean
)
returns void
language plpgsql
set search_path = ''
as $$
declare
  associated_count integer;
begin
  if not public.is_admin() then
    raise exception 'Acesso administrativo necessário.';
  end if;

  if p_from_kind not in ('captor', 'broker')
     or p_to_kind not in ('captor', 'broker')
     or p_from_kind = p_to_kind then
    raise exception 'A mudança de função informada é inválida.';
  end if;

  if p_from_kind = 'captor' then
    perform 1 from public.captors where id = p_member_id for update;
    if not found then
      raise exception 'O captador não foi encontrado.';
    end if;
    if exists (select 1 from public.brokers where id = p_member_id) then
      raise exception 'Já existe um corretor com este identificador.';
    end if;
    select count(*) into associated_count
      from public.properties
      where captor_id = p_member_id and broker_id is not null;
    if associated_count > 0 then
      raise exception 'Não é possível trocar a função: % imóvel(is) associado(s) já possui(em) outro corretor. Remova ou altere essas atribuições e tente novamente.', associated_count;
    end if;

    insert into public.brokers (id, name, photo_url, phone, whatsapp, email, description, active)
    values (p_member_id, p_name, p_photo_url, p_phone, p_whatsapp, p_email, p_description, p_active);

    update public.properties
      set broker_id = p_member_id, captor_id = null
      where captor_id = p_member_id;

    delete from public.captors where id = p_member_id;
  else
    perform 1 from public.brokers where id = p_member_id for update;
    if not found then
      raise exception 'O corretor não foi encontrado.';
    end if;
    if exists (select 1 from public.captors where id = p_member_id) then
      raise exception 'Já existe um captador com este identificador.';
    end if;
    select count(*) into associated_count
      from public.properties
      where broker_id = p_member_id and captor_id is not null;
    if associated_count > 0 then
      raise exception 'Não é possível trocar a função: % imóvel(is) associado(s) já possui(em) outro captador. Remova ou altere essas atribuições e tente novamente.', associated_count;
    end if;

    insert into public.captors (id, name, photo_url, phone, whatsapp, email, description, active)
    values (p_member_id, p_name, p_photo_url, p_phone, p_whatsapp, p_email, p_description, p_active);

    update public.properties
      set captor_id = p_member_id, broker_id = null
      where broker_id = p_member_id;

    delete from public.brokers where id = p_member_id;
  end if;
end;
$$;

revoke all on function public.move_team_member(text, text, uuid, text, text, text, text, text, text, boolean) from public;
grant execute on function public.move_team_member(text, text, uuid, text, text, text, text, text, text, boolean) to authenticated;
