-- Sign-in provisioning (#4): User, Journal, Category.
--
-- users.id is the Supabase Auth subject (JWT sub). Deliberately NOT a foreign
-- key into auth.users: the domain stays decoupled from GoTrue internals, and
-- account deletion (#15) manages its own cascade with an audit trail.
--
-- RLS is enabled with no policies as defense in depth: the API connects as
-- the table owner (which bypasses RLS), while PostgREST roles are denied if
-- these tables are ever exposed through the Data API.

create table users (
    id uuid primary key,
    created_at timestamptz not null default now()
);

-- One Journal per User in the MVP; the unique constraint is the enforcement
-- and future multi-journal support is its removal (spec: multi-user model).
create table journals (
    id uuid primary key default gen_random_uuid(),
    owner_id uuid not null unique references users (id),
    created_at timestamptz not null default now()
);

-- Two levels deep: a Category has parent_id null, a Subcategory points at its
-- parent. Depth is enforced by the API (all taxonomy rules live there,
-- ADR-0002). Renaming to an existing name is rejected via the unique
-- constraint; color is a hex value (presets come from the category palette,
-- custom colors are free-form per the ratified color drawer).
create table categories (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references users (id),
    parent_id uuid references categories (id),
    name text not null,
    color text not null,
    icon text not null,
    position integer not null,
    created_at timestamptz not null default now(),
    unique nulls not distinct (user_id, parent_id, name)
);

create index categories_user_idx on categories (user_id);

alter table users enable row level security;
alter table journals enable row level security;
alter table categories enable row level security;
