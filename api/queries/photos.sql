-- name: GetOwnedEntry :one
-- The Entry, if it belongs to the signed-in User's Journal.
select e.id
from entries e
join journals j on j.id = e.journal_id
where e.id = @entry_id::uuid and j.owner_id = @user_id::uuid;

-- name: CountPhotos :one
select count(*) from photos where entry_id = @entry_id::uuid;

-- name: InsertPhoto :one
insert into photos (entry_id, position, object_path, thumb_path, taken_at)
values (
    @entry_id::uuid,
    (select coalesce(max(position), 0) + 1 from photos where entry_id = @entry_id::uuid),
    @object_path,
    @thumb_path,
    sqlc.narg(taken_at)::timestamptz
)
returning id, position;

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
