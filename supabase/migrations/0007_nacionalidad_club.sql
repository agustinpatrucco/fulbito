-- Two optional badges shown on the card, over the photo at the left margin. Null means
-- "not set" — most players won't have one, and nothing is drawn in that case.

alter table public.players add column if not exists nacionalidad text
  check (nacionalidad is null or nacionalidad in ('Argentina', 'España', 'Uruguay'));

alter table public.players add column if not exists club text
  check (club is null or club in (
    'Barcelona', 'Boca Juniors', 'Independiente', 'Racing', 'Real Madrid',
    'River Plate', 'San Lorenzo'
  ));
