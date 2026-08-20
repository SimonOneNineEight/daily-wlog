-- name: GetAccountStatus :one
select deleted_at from users where id = @user_id::uuid;

-- name: DeactivateAccount :execrows
update users set deleted_at = now()
where id = @user_id::uuid and deleted_at is null;

-- name: ReactivateAccount :execrows
update users set deleted_at = null
where id = @user_id::uuid and deleted_at is not null;

-- name: InsertAccountAudit :exec
insert into account_audit (user_id, event, scope)
values (@user_id::uuid, @event, sqlc.narg(scope)::jsonb);

-- name: ListAccountAudit :many
select event, at, scope from account_audit
where user_id = @user_id::uuid
order by at, event;

-- name: ListPurgeDue :many
select id from users
where deleted_at is not null and deleted_at < @cutoff::timestamptz;

-- name: ListUserPhotoPaths :many
select p.object_path, p.thumb_path
from photos p
join entries e on e.id = p.entry_id
join journals j on j.id = e.journal_id
where j.owner_id = @user_id::uuid;

-- The purge cascade (#15) runs child-to-parent because the schema's FKs do
-- not cascade (photos excepted). Each step is idempotent, so a purge
-- interrupted midway finishes on the next run.

-- name: PurgeUserEntries :execrows
delete from entries e
using journals j
where e.journal_id = j.id and j.owner_id = @user_id::uuid;

-- name: PurgeUserChildCategories :execrows
delete from categories
where user_id = @user_id::uuid and parent_id is not null;

-- name: PurgeUserParentCategories :execrows
delete from categories
where user_id = @user_id::uuid;

-- name: PurgeUserColorRecents :execrows
delete from color_recents where user_id = @user_id::uuid;

-- name: PurgeUserJournal :execrows
delete from journals where owner_id = @user_id::uuid;

-- name: PurgeUserRow :execrows
delete from users where id = @user_id::uuid;
