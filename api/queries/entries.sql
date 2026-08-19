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
insert into entries (journal_id, author_id, entry_date, position, category_id, subcategory_id, content)
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
    sqlc.narg(subcategory_id)::uuid,
    @content
)
returning id, position;

-- name: ListEntriesByDate :many
select
    id,
    to_char(entry_date, 'YYYY-MM-DD') as entry_date,
    position,
    category_id,
    subcategory_id,
    author_id,
    content
from entries
where journal_id = @journal_id::uuid and entry_date = @entry_date::date
order by position;
