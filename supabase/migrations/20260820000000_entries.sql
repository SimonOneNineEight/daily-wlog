-- Entries (#5): the daily ritual's core record.
--
-- Content (title, note) is ONE opaque, versioned blob the server stores and
-- returns but never parses (ADR-0004): no server-side validation, search, or
-- batch job may read it. The structure calendars need (date, category,
-- position, author) stays in server-readable columns.
--
-- author_id is distinct from the Journal's owner on purpose: the spec models
-- future co-written couple journals without a migration.
create table entries (
    id uuid primary key default gen_random_uuid(),
    journal_id uuid not null references journals (id),
    author_id uuid not null references users (id),
    entry_date date not null,
    position integer not null,
    category_id uuid not null references categories (id),
    -- Optional Subcategory refinement; #9 wires it into the form and the
    -- API contract. Kept out of both until then.
    subcategory_id uuid references categories (id),
    content bytea not null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    -- Deferrable so #7's drag-reorder can swap positions in one transaction.
    unique (journal_id, entry_date, position) deferrable initially immediate
);

create index entries_journal_date_idx on entries (journal_id, entry_date);

alter table entries enable row level security;
