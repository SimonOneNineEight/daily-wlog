-- name: GetOwnedEntry :one
-- The Entry, if it belongs to the signed-in User's Journal.
select e.id
from entries e
join journals j on j.id = e.journal_id
where e.id = @entry_id::uuid and j.owner_id = @user_id::uuid;

-- name: CountPhotos :one
select count(*) from photos where entry_id = @entry_id::uuid;

-- name: InsertPhotos :many
-- One statement so a batch registers all-or-nothing, with the 10-photo cap
-- re-checked inside it: under a concurrent register the count subquery sees
-- the committed rows, the guard fails, and zero rows come back.
insert into photos (entry_id, position, object_path, thumb_path, taken_at)
select
    @entry_id::uuid,
    (select coalesce(max(position), 0) from photos where entry_id = @entry_id::uuid) + u.ord,
    u.object_path,
    u.thumb_path,
    u.taken_at
from (
    select
        generate_subscripts(@object_paths::text[], 1) as ord,
        unnest(@object_paths::text[]) as object_path,
        unnest(@thumb_paths::text[]) as thumb_path,
        unnest(@taken_ats::timestamptz[]) as taken_at
) as u
where (select count(*) from photos where entry_id = @entry_id::uuid)
    + cardinality(@object_paths::text[]) <= 10
returning id;

-- name: ListPhotosForEntries :many
select id, entry_id, position, object_path, thumb_path, taken_at
from photos
where entry_id = any(@entry_ids::uuid[])
order by entry_id, position;

-- name: DeletePhoto :one
-- Ownership travels through the Entry's Journal; returns the storage paths
-- for best-effort object cleanup.
delete from photos p
using entries e, journals j
where p.id = @id::uuid
  and e.id = p.entry_id
  and j.id = e.journal_id
  and j.owner_id = @user_id::uuid
returning p.object_path, p.thumb_path;

-- name: ListPhotoIDs :many
select id
from photos
where entry_id = @entry_id::uuid
order by position;

-- name: ReorderPhotos :exec
-- One statement, final order validated at commit by the deferred constraint.
update photos p
set position = new_order.new_position
from (
    select
        unnest(@photo_ids::uuid[]) as id,
        generate_subscripts(@photo_ids::uuid[], 1) as new_position
) as new_order
where p.id = new_order.id
  and p.entry_id = @entry_id::uuid;
