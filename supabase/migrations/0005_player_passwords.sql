-- Per-player login passwords. Not a real security boundary (this table is as openly
-- readable/writable as everything else in the app) — just enough friction to stop
-- someone from picking a friend's card instead of their own. Null means "nobody has
-- ever picked this player yet"; the app prompts to set one the first time someone does.

alter table public.players add column if not exists password_hash text;
alter table public.players add column if not exists password_salt text;
