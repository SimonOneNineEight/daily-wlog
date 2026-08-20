-- name: ListYearFirstCategories :many
-- One row per recorded day: the FIRST Entry's category by entry order
-- (distinct on keeps the first row of each date's position ordering).
-- Only structure leaves the database — never content (ADR-0004).
-- Under the filter (#13) the distinct-on picks the first MATCHING entry, so
-- a filtered day wears its topmost matching color; no match, no row.
select distinct on (entry_date)
    to_char(entry_date, 'YYYY-MM-DD') as entry_date,
    category_id
from entries
where journal_id = @journal_id::uuid
  and entry_date >= @first_day::date
  and entry_date < @next_year::date
  and (
    (cardinality(@category_ids::uuid[]) = 0 and cardinality(@subcategory_ids::uuid[]) = 0)
    or category_id = any(@category_ids::uuid[])
    or subcategory_id = any(@subcategory_ids::uuid[])
  )
order by entry_date, position;

-- name: CountYearEntries :one
select count(*)
from entries
where journal_id = @journal_id::uuid
  and entry_date >= @first_day::date
  and entry_date < @next_year::date
  and (
    (cardinality(@category_ids::uuid[]) = 0 and cardinality(@subcategory_ids::uuid[]) = 0)
    or category_id = any(@category_ids::uuid[])
    or subcategory_id = any(@subcategory_ids::uuid[])
  );
