-- Anzeige-Reihenfolge der Hobbys explizit speichern.
--
-- Hintergrund: Unter SQLite lieferte `order by rowid` implizit die
-- Einfüge-Reihenfolge, sodass „Meine Hobbys" im Profil so erschien, wie der
-- Nutzer sie gewählt hat. Postgres kennt keine rowid und garantiert ohne
-- ORDER BY überhaupt keine Reihenfolge — die Anzeige würde also springen.
-- `position` wird beim Speichern aus dem Index des übergebenen Arrays gesetzt.

alter table public.user_hobbies
  add column position smallint not null default 0;

create index user_hobbies_order_idx on public.user_hobbies (user_id, position);
