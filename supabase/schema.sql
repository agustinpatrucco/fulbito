-- Fulbito schema. Paste this whole file into the Supabase SQL editor and run it once.
--
-- Security model: anyone with the URL can READ the roster; only the single logged-in
-- account can WRITE. That is enforced here by Row Level Security, not by the client.
-- The anon key shipped in the browser bundle is harmless precisely because of this.

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
create policy "players are writable when signed in"
  on public.players for all
  to authenticated
  using (true)
  with check (true);

-- saved lineups ---------------------------------------------------------------

create table if not exists public.matches (
  id           uuid primary key default gen_random_uuid(),
  label        text,
  played_on    date not null default current_date,
  team_size    int not null check (team_size in (6, 7)),
  formation_a  text not null,
  formation_b  text not null,
  created_at   timestamptz not null default now()
);

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
create policy "matches are writable when signed in"
  on public.matches for all to authenticated using (true) with check (true);

drop policy if exists "match slots are readable by everyone" on public.match_slots;
create policy "match slots are readable by everyone"
  on public.match_slots for select using (true);

drop policy if exists "match slots are writable when signed in" on public.match_slots;
create policy "match slots are writable when signed in"
  on public.match_slots for all to authenticated using (true) with check (true);

-- photo storage ---------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('player-photos', 'player-photos', true)
on conflict (id) do nothing;

drop policy if exists "player photos are readable by everyone" on storage.objects;
create policy "player photos are readable by everyone"
  on storage.objects for select
  using (bucket_id = 'player-photos');

drop policy if exists "player photos are writable when signed in" on storage.objects;
create policy "player photos are writable when signed in"
  on storage.objects for all
  to authenticated
  using (bucket_id = 'player-photos')
  with check (bucket_id = 'player-photos');
