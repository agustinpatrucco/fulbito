-- Fulbito schema. Paste this whole file into the Supabase SQL editor and run it once.
--
-- Security model: anyone with the URL to a specific group (see "groups" below) can
-- READ and WRITE that group's players/matches. There's no per-row auth — a friend
-- "logs in" by picking their own name from Plantel, no password involved, so there's
-- no server-side identity to check writes against; the first player created in a group
-- is automatically its admin (players.is_admin), a client-side flag, not something Row
-- Level Security enforces below. What RLS *does* enforce is that a group's code can
-- never be listed or brute-forced — see the "groups" section.

create extension if not exists "pgcrypto";

-- groups ------------------------------------------------------------------------
--
-- Each group is a fully separate Plantel/Partido/Historial, unlocked by its own
-- random 6-character code. RLS is on with NO policies: nobody can select/insert this
-- table directly. The only way in is the get_group_by_code()/create_group() functions
-- below — an exact-match lookup can't enumerate what it doesn't already know.

create table if not exists public.groups (
  id         uuid primary key default gen_random_uuid(),
  code       text not null unique check (code ~ '^[a-z0-9]{6}$'),
  created_at timestamptz not null default now()
);

alter table public.groups enable row level security;

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
  alphabet text := '23456789abcdefghjkmnpqrstuvwxyz'; -- no 0/o/1/l/i
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

-- players ---------------------------------------------------------------------

create table if not exists public.players (
  id          uuid primary key default gen_random_uuid(),
  group_id    uuid not null references public.groups (id),
  is_admin    boolean not null default false,
  name        text not null check (length(trim(name)) > 0),
  nickname    text,
  aliases     text[] not null default '{}',
  positions   text[] not null check (
                array_length(positions, 1) >= 1
                and positions <@ array['POR','DFC','MC','DC']::text[]
              ),
  tier        text not null check (tier in ('gold','silver','bronze')),
  photo_url   text,
  photo_path  text,
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);

create index if not exists players_name_idx on public.players (name);
create index if not exists players_group_id_idx on public.players (group_id);

alter table public.players enable row level security;

drop policy if exists "players are readable by everyone" on public.players;
create policy "players are readable by everyone"
  on public.players for select
  using (true);

drop policy if exists "players are writable when signed in" on public.players;
drop policy if exists "players are writable by anyone with the link" on public.players;
create policy "players are writable by anyone with the link"
  on public.players for all
  using (true)
  with check (true);

-- fechas (matches) --------------------------------------------------------------
--
-- Only one match is "current" at a time: the one with the latest scheduled_at. It's
-- editable on the pitch until that moment passes, at which point it's locked (read-only
-- lineups) and shows up in the history, score pending until someone loads it.

create table if not exists public.matches (
  id           uuid primary key default gen_random_uuid(),
  group_id     uuid not null references public.groups (id),
  scheduled_at timestamptz not null,
  cancha       text not null check (cancha in ('Quintana','Complejo')),
  team_size    int not null check (team_size in (6, 7)),
  formation_a  text not null,
  formation_b  text not null,
  score_a      int check (score_a >= 0),
  score_b      int check (score_b >= 0),
  created_at   timestamptz not null default now()
);

create index if not exists matches_scheduled_at_idx on public.matches (scheduled_at desc);
create index if not exists matches_group_id_idx on public.matches (group_id);

create table if not exists public.match_slots (
  match_id   uuid not null references public.matches (id) on delete cascade,
  team       text not null check (team in ('A','B')),
  slot_index int not null,
  position   text not null check (position in ('POR','DFC','MC','DC')),
  player_id  uuid references public.players (id) on delete set null,
  primary key (match_id, team, slot_index)
);

alter table public.matches enable row level security;
alter table public.match_slots enable row level security;

drop policy if exists "matches are readable by everyone" on public.matches;
create policy "matches are readable by everyone"
  on public.matches for select using (true);

drop policy if exists "matches are writable when signed in" on public.matches;
drop policy if exists "matches are writable by anyone with the link" on public.matches;
create policy "matches are writable by anyone with the link"
  on public.matches for all using (true) with check (true);

drop policy if exists "match slots are readable by everyone" on public.match_slots;
create policy "match slots are readable by everyone"
  on public.match_slots for select using (true);

drop policy if exists "match slots are writable when signed in" on public.match_slots;
drop policy if exists "match slots are writable by anyone with the link" on public.match_slots;
create policy "match slots are writable by anyone with the link"
  on public.match_slots for all using (true) with check (true);

-- photo storage ---------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('player-photos', 'player-photos', true)
on conflict (id) do nothing;

drop policy if exists "player photos are readable by everyone" on storage.objects;
create policy "player photos are readable by everyone"
  on storage.objects for select
  using (bucket_id = 'player-photos');

drop policy if exists "player photos are writable when signed in" on storage.objects;
drop policy if exists "player photos are writable by anyone with the link" on storage.objects;
create policy "player photos are writable by anyone with the link"
  on storage.objects for all
  using (bucket_id = 'player-photos')
  with check (bucket_id = 'player-photos');
