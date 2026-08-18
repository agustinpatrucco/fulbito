-- Opens writes to everyone, not just the signed-in admin.
--
-- The app now has a second login path: picking an existing player from Plantel, no
-- password needed. That flow never touches Supabase Auth, so "authenticated" stops
-- being a meaningful boundary for these tables. The admin password still exists (via
-- Supabase Auth, unchanged) and still gates admin-only actions like creating/deleting
-- players or backfilling old partidos — but only in the client, the same trust model
-- the rest of this app (a private link shared with friends) already runs on.

drop policy if exists "players are writable when signed in" on public.players;
create policy "players are writable by anyone with the link"
  on public.players for all
  using (true)
  with check (true);

drop policy if exists "matches are writable when signed in" on public.matches;
create policy "matches are writable by anyone with the link"
  on public.matches for all
  using (true)
  with check (true);

drop policy if exists "match slots are writable when signed in" on public.match_slots;
create policy "match slots are writable by anyone with the link"
  on public.match_slots for all
  using (true)
  with check (true);

drop policy if exists "player photos are writable when signed in" on storage.objects;
create policy "player photos are writable by anyone with the link"
  on storage.objects for all
  using (bucket_id = 'player-photos')
  with check (bucket_id = 'player-photos');
