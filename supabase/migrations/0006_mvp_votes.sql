-- One MVP vote per player per match, cast an hour after kickoff once the Resultado
-- and MVP voting unlock. No update/delete policy below — a vote is final once cast,
-- enforced at the DB level, not just in the client.

create table if not exists public.match_mvp_votes (
  match_id         uuid not null references public.matches (id) on delete cascade,
  voter_player_id  uuid not null references public.players (id) on delete cascade,
  voted_player_id  uuid not null references public.players (id) on delete cascade,
  created_at       timestamptz not null default now(),
  primary key (match_id, voter_player_id)
);

alter table public.match_mvp_votes enable row level security;

drop policy if exists "mvp votes are readable by everyone" on public.match_mvp_votes;
create policy "mvp votes are readable by everyone"
  on public.match_mvp_votes for select using (true);

drop policy if exists "mvp votes are insertable by anyone with the link" on public.match_mvp_votes;
create policy "mvp votes are insertable by anyone with the link"
  on public.match_mvp_votes for insert with check (true);
