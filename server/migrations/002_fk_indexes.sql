-- Fremdschlüssel-Indizes.
--
-- Postgres legt für Fremdschlüssel KEINE Indizes an. Fehlen sie, führt jedes
-- ON DELETE CASCADE und jeder Join über die Spalte zu einem Full Table Scan.
-- Für Zamma besonders relevant: Die Konto-Löschung (DSGVO) kaskadiert über
-- praktisch alle user_id-Spalten, und der Feed joint events -> users (host).
--
-- Gefunden mit dieser Diagnose (liefert danach 0 Zeilen):
--   select conrelid::regclass, a.attname
--   from pg_constraint c
--   join pg_attribute a on a.attrelid = c.conrelid and a.attnum = any(c.conkey)
--   where c.contype = 'f' and connamespace = 'public'::regnamespace
--     and not exists (select 1 from pg_index i
--                     where i.indrelid = c.conrelid and a.attnum = i.indkey[0]);
--
-- Nicht enthalten (bereits abgedeckt): feedback.event_id ist führende Spalte
-- des UNIQUE(event_id, from_user_id, about_user_id), participations.user_id,
-- chat_members.series_id, blocks.user_id sind jeweils führende PK-Spalten.

create index blocks_blocked_id_idx on public.blocks (blocked_id);
create index chat_members_user_id_idx on public.chat_members (user_id);
create index chat_messages_user_id_idx on public.chat_messages (user_id);
create index events_host_id_idx on public.events (host_id);
create index feedback_from_user_id_idx on public.feedback (from_user_id);
create index reports_from_user_id_idx on public.reports (from_user_id);
