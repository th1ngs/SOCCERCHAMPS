-- Soccer Champs Manager: carreiras na nuvem e Hall da Fama.
-- Idempotente: pode ser executado várias vezes (npm run db:migrate).

create table if not exists careers (
  id           uuid primary key default gen_random_uuid(),
  code         text not null unique,
  manager_name text not null,
  club_id      text not null,
  club_name    text not null,
  division     text not null,
  season       integer not null,
  week         integer not null,
  titles       integer not null default 0,
  data         jsonb not null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists careers_updated_at_idx on careers (updated_at desc);

create table if not exists achievements (
  id           bigserial primary key,
  career_id    uuid not null references careers (id) on delete cascade,
  manager_name text not null,
  club_id      text not null,
  club_name    text not null,
  season       integer not null,
  competition  text not null,
  created_at   timestamptz not null default now(),
  unique (career_id, season, competition)
);

create index if not exists achievements_created_at_idx on achievements (created_at desc);
