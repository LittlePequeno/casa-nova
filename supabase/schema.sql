-- Rodar uma vez no SQL Editor do Supabase.
-- Modelo: visitantes não leem nem escrevem na tabela direto.
-- Leem só a coluna item_id e reservam/cancelam via funções.

create extension if not exists pgcrypto;

create table if not exists public.reservas (
  item_id     text primary key,               -- 1 reserva por item, impede presente repetido
  nome        text not null check (char_length(nome) between 1 and 80),
  token_hash  text not null,                  -- hash do token salvo no navegador de quem reservou
  criado_em   timestamptz not null default now()
);

alter table public.reservas enable row level security;

-- Visitante lê só a coluna item_id (sem nome, sem token)
revoke all on public.reservas from anon, authenticated;
grant select (item_id) on public.reservas to anon;
create policy "visitante ve ids reservados"
  on public.reservas for select to anon using (true);

-- Reservar: falha se o item já estiver reservado
create or replace function public.reservar(p_item text, p_nome text, p_token text)
returns boolean
language plpgsql security definer set search_path = public, extensions as $$
begin
  if p_token is null or char_length(p_token) < 16 then
    raise exception 'token invalido';
  end if;
  insert into reservas (item_id, nome, token_hash)
  values (p_item, trim(p_nome), encode(digest(p_token, 'sha256'), 'hex'));
  return true;
exception when unique_violation then
  return false;
end $$;

-- Cancelar: só quem reservou (mesmo token) consegue
create or replace function public.cancelar(p_item text, p_token text)
returns boolean
language plpgsql security definer set search_path = public, extensions as $$
declare n int;
begin
  delete from reservas
  where item_id = p_item and token_hash = encode(digest(p_token, 'sha256'), 'hex');
  get diagnostics n = row_count;
  return n > 0;
end $$;

revoke all on function public.reservar(text, text, text) from public;
revoke all on function public.cancelar(text, text) from public;
grant execute on function public.reservar(text, text, text) to anon;
grant execute on function public.cancelar(text, text) to anon;

-- Pra vocês verem quem reservou o quê: Table Editor > reservas (no painel do Supabase).
