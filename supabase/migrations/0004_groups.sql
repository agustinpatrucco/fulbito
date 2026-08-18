-- Grupos: turns the single shared roster into many isolated groups, each unlocked by
-- its own random 6-character code. Replaces the shared admin password entirely — the
-- first player created in a group is automatically its admin.

create table if not exists public.groups (
  id         uuid primary key default gen_random_uuid(),
  code       text not null unique check (code ~ '^[a-z0-9]{6}$'),
  created_at timestamptz not null default now()
);

-- RLS is on with NO policies below: anon and authenticated get zero direct access to
-- this table. A code must never be listable or brute-forceable via a bulk read — the
-- only door in is the get_group_by_code() function further down, an exact-match
-- lookup that can't enumerate what it doesn't already know.
alter table public.groups enable row level security;

alter table public.players add column if not exists group_id uuid references public.groups (id);
alter table public.players add column if not exists is_admin boolean not null default false;
alter table public.matches add column if not exists group_id uuid references public.groups (id);

create index if not exists players_group_id_idx on public.players (group_id);
create index if not exists matches_group_id_idx on public.matches (group_id);

-- --- migrate existing data into a "consti" group ------------------------------

insert into public.groups (code) values ('consti')
  on conflict (code) do nothing;

update public.players set group_id = (select id from public.groups where code = 'consti')
  where group_id is null;
update public.matches set group_id = (select id from public.groups where code = 'consti')
  where group_id is null;

-- Check this returns exactly the one player who should be admin before running the
-- update below — adjust the ilike pattern if it matches zero or more than one row.
--   select id, name from public.players where name ilike '%patrucco%';
update public.players set is_admin = true
  where group_id = (select id from public.groups where code = 'consti')
    and name ilike '%patrucco%';

-- Every row has a group now — enforce it going forward.
alter table public.players alter column group_id set not null;
alter table public.matches alter column group_id set not null;

-- --- RPCs: the only way in or out of the groups table -------------------------

create or replace function public.get_group_by_code(p_code text)
returns table (id uuid, code text)
language sql
security definer
set search_path = public
as $$
  select id, code from public.groups where code = lower(p_code);
$$;

grant execute on function public.get_group_by_code(text) to anon, authenticated;

create or replace function public.create_group()
returns table (id uuid, code text)
language plpgsql
security definer
set search_path = public
as $$
declare
  new_code text;
  -- No 0/o/1/l/i — a random code gets typed by hand, so it skips characters that are
  -- easy to mix up. Existing hand-picked codes like "consti" aren't restricted to this.
  alphabet text := '23456789abcdefghjkmnpqrstuvwxyz';
  attempt int := 0;
begin
  loop
    new_code := '';
    for i in 1..6 loop
      new_code := new_code || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    end loop;
    begin
      insert into public.groups (code) values (new_code);
      exit;
    exception when unique_violation then
      attempt := attempt + 1;
      if attempt > 20 then
        raise exception 'No se pudo generar un código único';
      end if;
    end;
  end loop;
  return query select g.id, g.code from public.groups g where g.code = new_code;
end;
$$;

grant execute on function public.create_group() to anon, authenticated;
