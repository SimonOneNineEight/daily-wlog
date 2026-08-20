-- name: ProvisionUser :exec
-- First-sign-in provisioning in one atomic statement: User, Journal, and the
-- five seeded categories (colors/icons per the design canvas). Every level
-- conflict-skips, so re-sign-in and concurrent first sign-ins are no-ops.
-- CTE chaining (each part reads the_user) forces execution order; FK checks
-- fire at end of statement, when the user row exists.
with new_user as (
    insert into users (id)
    values (@user_id::uuid)
    on conflict (id) do nothing
    returning id
), the_user as (
    select id from new_user
    union all
    select id from users where id = @user_id::uuid
    limit 1
), new_journal as (
    insert into journals (owner_id)
    select id from the_user
    on conflict (owner_id) do nothing
)
insert into categories (user_id, name, color, icon, position)
select u.id, seed.name, seed.color, seed.icon, seed.position
from the_user u
cross join (values
    ('工作', '#4A93C4', 'briefcase', 1),
    ('運動', '#73B062', 'dumbbell', 2),
    ('美食', '#D3AE40', 'utensils', 3),
    ('旅遊', '#D56E5C', 'plane', 4),
    ('個人', '#A26FBD', 'book-open', 5)
) as seed (name, color, icon, position)
on conflict do nothing;

-- name: GetJournal :one
select id from journals where owner_id = @user_id::uuid;

-- name: ListCategories :many
-- Usage flags ride along so the management screen can offer delete only
-- where the lifecycle model allows it.
select
    c.id,
    c.name,
    c.color,
    c.icon,
    c.parent_id,
    c.position,
    exists (
        select 1 from entries e
        where e.category_id = c.id or e.subcategory_id = c.id
    ) as in_use,
    exists (
        select 1 from categories k where k.parent_id = c.id
    ) as has_children
from categories c
where c.user_id = @user_id::uuid
order by c.position, c.created_at;
