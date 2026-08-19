-- name: InsertCategory :one
-- Position lands after existing siblings (same parent level). Name
-- uniqueness per (user, parent) is enforced by the table's UNIQUE NULLS NOT
-- DISTINCT constraint; the handler maps that violation to 409.
insert into categories (user_id, parent_id, name, color, icon, position)
values (
    @user_id::uuid,
    sqlc.narg(parent_id)::uuid,
    @name,
    @color,
    @icon,
    (
        select coalesce(max(position), 0) + 1
        from categories
        where user_id = @user_id::uuid
          and parent_id is not distinct from sqlc.narg(parent_id)::uuid
    )
)
returning id, position;

-- name: SubcategoryIsUsable :one
-- A usable Entry refinement: owned by the user and a child of exactly the
-- Entry's Category.
select exists (
    select 1
    from categories
    where id = @subcategory_id::uuid
      and user_id = @user_id::uuid
      and parent_id = @category_id::uuid
) as usable;

-- name: GetCategoryParent :one
-- Ownership gate for edits: no rows means not yours or not there (404).
select parent_id
from categories
where id = @id::uuid and user_id = @user_id::uuid;

-- name: UpdateCategory :one
update categories
set name = coalesce(sqlc.narg(name), name),
    color = coalesce(sqlc.narg(color), color),
    icon = coalesce(sqlc.narg(icon), icon)
where id = @id::uuid and user_id = @user_id::uuid
returning id, name, color, icon, parent_id, position;

-- name: CascadeChildColors :exec
-- Subcategories store a denormalized copy of the parent's color (#9);
-- recoloring the parent rewrites the copies so stored data stays honest.
update categories
set color = @color
where parent_id = @id::uuid and user_id = @user_id::uuid;

-- name: CategoryUsage :one
-- "In use" per the Apple Calendar lifecycle model: referenced by any Entry
-- as its category or its refinement. Callers gate ownership first.
select
    exists (
        select 1 from entries
        where category_id = @id::uuid or subcategory_id = @id::uuid
    ) as in_use,
    exists (
        select 1 from categories where parent_id = @id::uuid
    ) as has_children;

-- name: DeleteCategory :execrows
delete from categories
where id = @id::uuid and user_id = @user_id::uuid;
