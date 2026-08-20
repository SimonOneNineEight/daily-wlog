-- Saved custom colors (#11): the color drawer's recents row. One row per
-- (user, color); used_seq is a monotonic recency stamp — the upsert bumps it
-- on every save, so ordering is deterministic even for saves inside the same
-- clock tick. The 12-color LRU cap is enforced by the API's trim query.
create sequence color_recents_seq;

create table color_recents (
    user_id uuid not null references users (id),
    color text not null,
    used_seq bigint not null default nextval('color_recents_seq'),
    primary key (user_id, color)
);

alter table color_recents enable row level security;
