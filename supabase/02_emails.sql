-- Migração 02: email de quem reservou, status e links de confirmação.
-- No SQL Editor do Supabase, rodar a PARTE 1 e depois a PARTE 2 em queries separadas.

-- ===== PARTE 1 =====
alter table public.reservas
  add column if not exists item_nome text,
  add column if not exists email text,
  add column if not exists status text not null default 'pendente',
  add column if not exists link_token text not null default encode(extensions.gen_random_bytes(18), 'hex'),
  add column if not exists email_enviado_em timestamptz,
  add column if not exists aviso_enviado_em timestamptz;
alter table public.reservas drop constraint if exists reservas_status_check;
alter table public.reservas add constraint reservas_status_check check (status in ('pendente', 'confirmado'));
alter table public.reservas drop constraint if exists reservas_email_check;
alter table public.reservas add constraint reservas_email_check check (email is null or position('@' in email) > 1);
create unique index if not exists reservas_link_token_idx on public.reservas (link_token);
revoke all on public.reservas from anon, authenticated;
grant select (item_id) on public.reservas to anon;
drop function if exists public.reservar(text, text, text);

-- ===== PARTE 2 =====
create or replace function public.reservar(p_item text, p_item_nome text, p_nome text, p_email text, p_token text, p_comprado boolean)
returns boolean language plpgsql security definer set search_path = public, extensions
as $fn$
begin
  if p_token is null or char_length(p_token) < 16 then
    raise exception 'token invalido';
  end if;
  insert into reservas (item_id, item_nome, nome, email, token_hash, status)
  values (p_item, left(p_item_nome, 120), trim(p_nome), lower(trim(p_email)),
          encode(digest(p_token, 'sha256'), 'hex'),
          case when p_comprado then 'confirmado' else 'pendente' end);
  return true;
exception when unique_violation then
  return false;
end
$fn$;
create or replace function public.info_link(p_link text)
returns table (item_id text, item_nome text, nome text, status text)
language sql security definer set search_path = public
as $fn$
  select r.item_id, r.item_nome, r.nome, r.status from reservas r where r.link_token = p_link;
$fn$;
create or replace function public.responder_link(p_link text, p_acao text)
returns text language plpgsql security definer set search_path = public
as $fn$
declare n int;
begin
  if p_acao = 'comprei' then
    update reservas set status = 'confirmado' where link_token = p_link;
    get diagnostics n = row_count;
    return case when n > 0 then 'confirmado' else 'nao_encontrado' end;
  elsif p_acao = 'desisti' then
    delete from reservas where link_token = p_link;
    get diagnostics n = row_count;
    return case when n > 0 then 'liberado' else 'nao_encontrado' end;
  end if;
  raise exception 'acao invalida';
end
$fn$;
revoke all on function public.reservar(text, text, text, text, text, boolean) from public;
revoke all on function public.info_link(text) from public;
revoke all on function public.responder_link(text, text) from public;
grant execute on function public.reservar(text, text, text, text, text, boolean) to anon;
grant execute on function public.info_link(text) to anon;
grant execute on function public.responder_link(text, text) to anon;

-- ===== PARTE 3 (endereço por email) =====
alter table public.reservas add column if not exists endereco_enviado_em timestamptz;
