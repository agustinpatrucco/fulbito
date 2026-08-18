-- Fulbito schema. Paste this whole file into the Supabase SQL editor and run it once.
--
-- Security model: anyone with the URL can READ and WRITE. There's no per-row auth —
-- a friend "logs in" by picking their own name from Plantel, no password involved, so
-- there's no server-side identity to check writes against. The one real Supabase Auth
-- account (see README) still exists and still gates admin-only actions in the client
-- (creating/deleting players, backfilling old partidos), but that's a client-side flag,
-- not something Row Level Security enforces below.

create extension if not exists "pgcrypto";

-- players ---------------------------------------------------------------------

create table if not exists public.players (
  id          uuid primary key default gen_random_uuid(),
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
