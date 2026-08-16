-- Migration for projects that already ran the original schema.sql.
--
-- The original `matches` table was scaffolding for a feature that was never actually
-- wired up (squads used to live in the browser only), so it's empty on every real
-- project — safe to drop and recreate with the shape the Fecha feature needs, rather
-- than migrating data that was never used.
--
-- Paste this into the Supabase SQL editor and run it once.

drop table if exists public.matches cascade;

create table public.matches (
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

create index matches_scheduled_at_idx on public.matches (scheduled_at desc);

create table public.match_slots (
  match_id   uuid not null references public.matches (id) on delete cascade,
  team       text not null check (team in ('A','B')),
  slot_index int not null,
  position   text not null check (position in ('POR','DFC','MC','DC')),
  player_id  uuid references public.players (id) on delete set null,
  primary key (match_id, team, slot_index)
);

alter table public.matches enable row level security;
alter table public.match_slots enable row level security;

create policy "matches are readable by everyone"
  on public.matches for select using (true);

create policy "matches are writable when signed in"
  on public.matches for all to authenticated using (true) with check (true);

create policy "match slots are readable by everyone"
  on public.match_slots for select using (true);

create policy "match slots are writable when signed in"
  on public.match_slots for all to authenticated using (true) with check (true);
