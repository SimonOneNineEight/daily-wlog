-- name: SaveColorRecent :exec
-- LRU save: a new color joins with a fresh used_seq; re-saving an existing
-- one bumps its used_seq, moving it to the front of the recency order.
insert into color_recents (user_id, color)
values (@user_id::uuid, @color)
on conflict (user_id, color)
do update set used_seq = nextval('color_recents_seq');

-- name: TrimColorRecents :exec
-- Evict beyond the cap: keep the @keep most recent colors, drop the rest.
delete from color_recents
where user_id = @user_id::uuid
  and used_seq not in (
      select used_seq
      from color_recents
      where user_id = @user_id::uuid
      order by used_seq desc
      limit @keep
  );

-- name: ListColorRecents :many
-- Most-recent first; SaveColorRecent's trim keeps the list within the cap.
select color
from color_recents
where user_id = @user_id::uuid
order by used_seq desc;
