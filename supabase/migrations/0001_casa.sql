-- Faxina Quest: uma "casa" guarda o estado do jogo compartilhado pelo casal.
-- Rode este arquivo inteiro no SQL Editor do Supabase (uma vez).

create table if not exists public.households (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  state jsonb,
  version integer not null default 0,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.household_members (
  household_id uuid not null references public.households (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (household_id, user_id)
);

alter table public.households enable row level security;
alter table public.household_members enable row level security;

-- Função auxiliar sem recursão de RLS
create or replace function public.is_member(h uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from household_members where household_id = h and user_id = auth.uid());
$$;

drop policy if exists "membros leem a casa" on public.households;
create policy "membros leem a casa" on public.households
  for select using (public.is_member(id));

drop policy if exists "membros atualizam a casa" on public.households;
create policy "membros atualizam a casa" on public.households
  for update using (public.is_member(id)) with check (public.is_member(id));

drop policy if exists "membro vê os membros da sua casa" on public.household_members;
create policy "membro vê os membros da sua casa" on public.household_members
  for select using (public.is_member(household_id));

drop policy if exists "membro sai da casa" on public.household_members;
create policy "membro sai da casa" on public.household_members
  for delete using (user_id = auth.uid());

-- Cria uma casa com código de convite de 6 caracteres e entra nela
create or replace function public.create_household(initial_state jsonb)
returns public.households language plpgsql security definer set search_path = public as $$
declare
  h households;
  c text;
  i integer;
begin
  if auth.uid() is null then raise exception 'login necessário'; end if;
  loop
    c := '';
    for i in 1..6 loop
      c := c || substr('ABCDEFGHJKMNPQRSTUVWXYZ23456789', 1 + floor(random() * 31)::int, 1);
    end loop;
    exit when not exists (select 1 from households where code = c);
  end loop;
  insert into households (code, state, version, updated_by) values (c, initial_state, 1, auth.uid()) returning * into h;
  insert into household_members (household_id, user_id) values (h.id, auth.uid());
  return h;
end $$;

-- Entra numa casa pelo código (no máximo 2 pessoas)
create or replace function public.join_household(invite text)
returns public.households language plpgsql security definer set search_path = public as $$
declare
  h households;
begin
  if auth.uid() is null then raise exception 'login necessário'; end if;
  select * into h from households where code = upper(trim(invite));
  if not found then raise exception 'código não encontrado'; end if;
  if not exists (select 1 from household_members where household_id = h.id and user_id = auth.uid()) then
    if (select count(*) from household_members where household_id = h.id) >= 2 then
      raise exception 'esta casa já tem 2 pessoas';
    end if;
    insert into household_members (household_id, user_id) values (h.id, auth.uid());
  end if;
  return h;
end $$;

-- Grava o estado só se ninguém gravou antes (controle de versão otimista)
create or replace function public.save_household(h uuid, expected_version integer, new_state jsonb)
returns integer language plpgsql security definer set search_path = public as $$
declare
  v integer;
begin
  if not public.is_member(h) then raise exception 'sem acesso'; end if;
  update households
     set state = new_state, version = version + 1, updated_at = now(), updated_by = auth.uid()
   where id = h and version = expected_version
  returning version into v;
  return coalesce(v, -1); -- -1 = conflito: alguém gravou antes, leia de novo e mescle
end $$;

grant execute on function public.create_household(jsonb) to authenticated;
grant execute on function public.join_household(text) to authenticated;
grant execute on function public.save_household(uuid, integer, jsonb) to authenticated;

-- Tempo real: avisa o outro celular quando a casa muda
do $$ begin
  alter publication supabase_realtime add table public.households;
exception when duplicate_object then null; end $$;
