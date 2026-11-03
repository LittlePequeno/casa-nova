-- Migração 03: cotas (itens caros divididos em partes pagas via Pix).
-- No SQL Editor do Supabase, rodar a PARTE 1 e depois a PARTE 2 em queries separadas.

-- ===== PARTE 1 =====
create table if not exists public.cotas (
  id                uuid primary key default gen_random_uuid(),
  item_id           text not null,
  item_nome         text,
  qtd               int  not null check (qtd between 1 and 50),
  nome              text not null check (char_length(nome) between 1 and 80),
  email             text check (email is null or position('@' in email) > 1),
  token_hash        text not null,
  status            text not null default 'pendente' check (status in ('pendente', 'confirmado')),
  link_token        text not null default encode(extensions.gen_random_bytes(18), 'hex'),
  criado_em         timestamptz not null default now(),
  email_enviado_em  timestamptz,
  aviso_enviado_em  timestamptz
);
create unique index if not exists cotas_link_token_idx on public.cotas (link_token);
create index if not exists cotas_item_idx on public.cotas (item_id);

alter table public.cotas enable row level security;
revoke all on public.cotas from anon, authenticated;
grant select (item_id, qtd) on public.cotas to anon;
drop policy if exists "visitante ve cotas" on public.cotas;
create policy "visitante ve cotas" on public.cotas for select to anon using (true);
grant select, update, delete on public.cotas to service_role;

drop function if exists public.info_link(text);

-- ===== PARTE 2 =====
create or replace function public.reservar_cota(
  p_item text, p_item_nome text, p_total int, p_qtd int,
  p_nome text, p_email text, p_token text, p_pago boolean
) returns uuid language plpgsql security definer set search_path = public, extensions
as $fn$
declare usadas int; novo uuid;
begin
  if p_token is null or char_length(p_token) < 16 then
    raise exception 'token invalido';
  end if;
  if p_qtd < 1 or p_total < 1 or p_total > 50 then
    raise exception 'quantidade invalida';
  end if;
  perform pg_advisory_xact_lock(hashtext('cota:' || p_item));
  select coalesce(sum(qtd), 0) into usadas from cotas where item_id = p_item;
  if usadas + p_qtd > p_total then
    return null;
  end if;
  insert into cotas (item_id, item_nome, qtd, nome, email, token_hash, status)
  values (p_item, left(p_item_nome, 120), p_qtd, trim(p_nome), lower(trim(p_email)),
          encode(digest(p_token, 'sha256'), 'hex'),
          case when p_pago then 'confirmado' else 'pendente' end)
  returning id into novo;
  return novo;
end
$fn$;

create or replace function public.cancelar_cota(p_id uuid, p_token text)
returns boolean language plpgsql security definer set search_path = public, extensions
as $fn$
declare n int;
begin
  delete from cotas where id = p_id and token_hash = encode(digest(p_token, 'sha256'), 'hex');
  get diagnostics n = row_count;
  return n > 0;
end
$fn$;

create or replace function public.info_link(p_link text)
returns table (tipo text, item_id text, item_nome text, nome text, status text, qtd int)
language sql security definer set search_path = public
as $fn$
  select 'item', r.item_id, r.item_nome, r.nome, r.status, 1 from reservas r where r.link_token = p_link
  union all
  select 'cota', c.item_id, c.item_nome, c.nome, c.status, c.qtd from cotas c where c.link_token = p_link;
$fn$;

create or replace function public.responder_link(p_link text, p_acao text)
returns text language plpgsql security definer set search_path = public
as $fn$
declare n int;
begin
  if p_acao = 'comprei' then
    update reservas set status = 'confirmado' where link_token = p_link;
    get diagnostics n = row_count;
    if n = 0 then
      update cotas set status = 'confirmado' where link_token = p_link;
      get diagnostics n = row_count;
    end if;
    return case when n > 0 then 'confirmado' else 'nao_encontrado' end;
  elsif p_acao = 'desisti' then
    delete from reservas where link_token = p_link;
    get diagnostics n = row_count;
    if n = 0 then
      delete from cotas where link_token = p_link;
      get diagnostics n = row_count;
    end if;
    return case when n > 0 then 'liberado' else 'nao_encontrado' end;
  end if;
  raise exception 'acao invalida';
end
$fn$;

revoke all on function public.reservar_cota(text, text, int, int, text, text, text, boolean) from public;
revoke all on function public.cancelar_cota(uuid, text) from public;
revoke all on function public.info_link(text) from public;
grant execute on function public.reservar_cota(text, text, int, int, text, text, text, boolean) to anon;
grant execute on function public.cancelar_cota(uuid, text) to anon;
grant execute on function public.info_link(text) to anon;
