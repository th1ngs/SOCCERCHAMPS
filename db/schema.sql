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

create table if not exists accounts (
  id uuid primary key default gen_random_uuid(),
  nickname text not null,
  nickname_key text not null unique,
  password_hash text not null,
  created_at timestamptz not null default now()
);

create table if not exists account_sessions (
  token_hash text primary key,
  account_id uuid not null references accounts (id) on delete cascade,
  expires_at timestamptz not null
);
create index if not exists account_sessions_account_idx on account_sessions (account_id);

create table if not exists login_attempts (
  nickname_key text primary key,
  failures integer not null default 0,
  blocked_until timestamptz,
  updated_at timestamptz not null default now()
);

create table if not exists account_saves (
  account_id uuid not null references accounts (id) on delete cascade,
  slot smallint not null check (slot between 1 and 3),
  manager_name text not null,
  club_name text not null,
  season integer not null,
  week integer not null,
  data jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (account_id, slot)
);
