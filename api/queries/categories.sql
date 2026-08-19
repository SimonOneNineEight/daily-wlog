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
