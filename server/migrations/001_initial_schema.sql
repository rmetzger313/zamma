-- Zamma — Basis-Schema für Supabase/Postgres (Stand: Juli 2026)
-- Abgeleitet aus dem erprobten SQLite-Schema (server/src/db.js), aber
-- Postgres-nativ: PostGIS statt Haversine, timestamptz, echte Booleans, jsonb.
--
-- WICHTIG: PostGIS liegt bewusst im Schema `extensions`, NICHT in `public`.
-- Sonst ist die PostGIS-Systemtabelle spatial_ref_sys ohne RLS über PostgREST
-- erreichbar und ST_*-Funktionen sind für anon ausführbar (Supabase-Linter
-- 0013/0014/0028). Backend-Verbindungen brauchen daher
--   search_path = public, extensions
-- oder voll qualifizierte Aufrufe (extensions.ST_DWithin(...)).
--
-- RLS ist auf allen Tabellen aktiv, absichtlich OHNE Policies:
-- deny-by-default. Das Zamma-Backend verbindet sich mit service_role und
-- umgeht RLS; der anon/authenticated-Key der App bekommt keinen Direktzugriff
-- auf Daten (die App spricht ausschließlich mit unserer API).

create schema if not exists extensions;
create extension if not exists postgis with schema extensions;

-- Profil-Daten; id spiegelt Supabase Auth (auth.users)
create table public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null,
  avatar_color text not null default '#FF6B42',
  photo text,
  city text,
  location extensions.geography(Point, 4326),
  bio text,
  join_date timestamptz not null default now(),
  verified_phone boolean not null default false,
  verified_phone_at timestamptz,
  verified_id boolean not null default false,
  verified_id_at timestamptz,
  reliability_score integer not null default 100 check (reliability_score between 0 and 100),
  meetings_attended integer not null default 0,
  avg_rating numeric(2,1),
  no_show_count integer not null default 0
);

create table public.user_hobbies (
  user_id uuid not null references public.users (id) on delete cascade,
  hobby text not null,
  skill_level smallint not null default 1 check (skill_level between 1 and 3),
  primary key (user_id, hobby)
);

create table public.user_locations (
  user_id uuid not null references public.users (id) on delete cascade,
  name text not null,
  location extensions.geography(Point, 4326) not null,
  radius_km numeric not null default 25 check (radius_km > 0),
  is_primary boolean not null default false,
  primary key (user_id, name)
);
create index user_locations_location_idx on public.user_locations using gist (location);

create table public.user_availability (
  user_id uuid not null references public.users (id) on delete cascade,
  kind text not null check (kind in ('day','slot')),
  value text not null,
  primary key (user_id, kind, value)
);

create table public.events (
  id uuid primary key default gen_random_uuid(),
  series_id uuid not null,
  host_id uuid not null references public.users (id) on delete cascade,
  title text not null check (char_length(title) <= 120),
  category text not null check (category in ('sport','spiele','kreativ','outdoor','kochen')),
  description text check (char_length(description) <= 2000),
  skill_level smallint not null default 1 check (skill_level between 1 and 3),
  datetime timestamptz not null,
  duration_min integer not null default 120 check (duration_min > 0),
  recurrence text check (recurrence in ('weekly','biweekly')),
  location_name text,
  city text,
  location extensions.geography(Point, 4326),
  dist_label_override text,
  max_spots integer not null default 6 check (max_spots between 2 and 50),
  status text not null default 'open' check (status in ('open','full','past','cancelled')),
  created_at timestamptz not null default now()
);
create index events_series_idx on public.events (series_id);
create index events_datetime_idx on public.events (datetime);
create index events_location_idx on public.events using gist (location);
create index events_status_idx on public.events (status);

create table public.participations (
  user_id uuid not null references public.users (id) on delete cascade,
  event_id uuid not null references public.events (id) on delete cascade,
  status text not null default 'joined' check (status in ('joined','cancelled','attended','no_show')),
  joined_at timestamptz,
  cancelled_at timestamptz,
  primary key (user_id, event_id)
);
create index participations_event_idx on public.participations (event_id);

-- 1× pro (Event, Bewerter, Bewerteter); kein Selbst-Feedback
create table public.feedback (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  from_user_id uuid not null references public.users (id) on delete cascade,
  about_user_id uuid not null references public.users (id) on delete cascade,
  stars smallint not null check (stars between 1 and 5),
  tags jsonb not null default '[]'::jsonb,
  comment text check (char_length(comment) <= 1000),
  created_at timestamptz not null default now(),
  unique (event_id, from_user_id, about_user_id),
  check (from_user_id <> about_user_id)
);
create index feedback_about_idx on public.feedback (about_user_id);

-- Gruppenchat je Event-Serie (bleibt über wiederkehrende Instanzen bestehen)
create table public.chat_groups (
  series_id uuid primary key,
  name text not null,
  initials text not null,
  color text not null
);

create table public.chat_members (
  series_id uuid not null references public.chat_groups (series_id) on delete cascade,
  user_id uuid not null references public.users (id) on delete cascade,
  last_read_at timestamptz,
  primary key (series_id, user_id)
);

create table public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  series_id uuid not null references public.chat_groups (series_id) on delete cascade,
  user_id uuid not null references public.users (id) on delete cascade,
  text text not null check (char_length(text) between 1 and 2000),
  created_at timestamptz not null default now()
);
create index chat_messages_series_idx on public.chat_messages (series_id, created_at);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  type text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  read_at timestamptz
);
create index notifications_user_idx on public.notifications (user_id, created_at desc);

create table public.blocks (
  user_id uuid not null references public.users (id) on delete cascade,
  blocked_id uuid not null references public.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, blocked_id),
  check (user_id <> blocked_id)
);

-- status: Grundlage für das Moderations-Backoffice (EU-DSA-Meldewege)
create table public.reports (
  id uuid primary key default gen_random_uuid(),
  from_user_id uuid not null references public.users (id) on delete cascade,
  target_type text not null check (target_type in ('user','event','message')),
  target_id text not null,
  reason text not null check (char_length(reason) <= 40),
  status text not null default 'open' check (status in ('open','reviewing','resolved','dismissed')),
  created_at timestamptz not null default now()
);
create index reports_status_idx on public.reports (status, created_at);

alter table public.users enable row level security;
alter table public.user_hobbies enable row level security;
alter table public.user_locations enable row level security;
alter table public.user_availability enable row level security;
alter table public.events enable row level security;
alter table public.participations enable row level security;
alter table public.feedback enable row level security;
alter table public.chat_groups enable row level security;
alter table public.chat_members enable row level security;
alter table public.chat_messages enable row level security;
alter table public.notifications enable row level security;
alter table public.blocks enable row level security;
alter table public.reports enable row level security;
