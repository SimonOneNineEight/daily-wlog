-- Photos (#8): up to 10 per Entry, bytes live in the private `photos`
-- storage bucket (client-re-encoded JPEGs plus client-generated thumbnails);
-- this table records structure only. Object paths are namespaced
-- {user}/{entry}/{uuid}.jpg, which presigning enforces per user.
create table photos (
    id uuid primary key default gen_random_uuid(),
    entry_id uuid not null references entries (id) on delete cascade,
    position integer not null,
    object_path text not null unique,
    thumb_path text not null unique,
    taken_at timestamptz,
    created_at timestamptz not null default now(),
    -- Deferrable like entries: photo drag-reorder swaps in one statement.
    unique (entry_id, position) deferrable initially deferred
);

create index photos_entry_idx on photos (entry_id);

alter table photos enable row level security;
