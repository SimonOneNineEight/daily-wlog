-- name: CategoryIsUsable :one
-- A usable Entry category is owned by the user and top-level: Subcategories
-- refine an Entry's Category, they never replace it.
select exists (
    select 1
    from categories
    where id = @category_id::uuid
      and user_id = @user_id::uuid
      and parent_id is null
) as usable;

-- name: InsertEntry :one
-- Position is assigned at the end of the date's existing order in the same
-- statement, so multiple Entries per day stack in creation order.
insert into entries (journal_id, author_id, entry_date, position, category_id, content)
values (
    @journal_id::uuid,
    @author_id::uuid,
    @entry_date::date,
    (
        select coalesce(max(position), 0) + 1
        from entries
        where journal_id = @journal_id::uuid and entry_date = @entry_date::date
    ),
    @category_id::uuid,
    @content
)
returning id, position;

-- name: UpdateEntry :one
-- Full replacement of the editable fields; journal_id scoping means a User
-- can only ever touch their own Entries (no rows = not found).
update entries
set category_id = @category_id::uuid,
    content = @content,
    updated_at = now()
where id = @id::uuid and journal_id = @journal_id::uuid
returning
    id,
    to_char(entry_date, 'YYYY-MM-DD') as entry_date,
    position,
    category_id,
    author_id,
    content;

-- name: DeleteEntry :execrows
delete from entries
where id = @id::uuid and journal_id = @journal_id::uuid;

-- name: ListEntryIDs :many
select id
from entries
where journal_id = @journal_id::uuid and entry_date = @entry_date::date
order by position;

-- name: ReorderEntries :exec
-- One statement assigning every entry its new 1..n position; the deferred
-- unique constraint validates the final order at commit.
update entries e
set position = new_order.new_position
from (
    select
        unnest(@entry_ids::uuid[]) as id,
        generate_subscripts(@entry_ids::uuid[], 1) as new_position
) as new_order
where e.id = new_order.id
  and e.journal_id = @journal_id::uuid
  and e.entry_date = @entry_date::date;

-- name: ListEntriesByDate :many
select
    id,
    to_char(entry_date, 'YYYY-MM-DD') as entry_date,
    position,
    category_id,
    author_id,
    content
from entries
where journal_id = @journal_id::uuid and entry_date = @entry_date::date
order by position;
