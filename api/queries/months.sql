-- name: ListMonthDots :many
-- One row per entry in the month, date-then-position order; the handler
-- groups rows into days. Only structure leaves the database — dots need
-- categories, never content (ADR-0004).
-- The filter (#13) is union semantics: a parent category matches all its
-- entries, a subcategory matches by subcategory; empty arrays mean no lens.
select
    to_char(entry_date, 'YYYY-MM-DD') as entry_date,
    category_id
from entries
where journal_id = @journal_id::uuid
  and entry_date >= @first_day::date
  and entry_date < @next_month::date
  and (
    (cardinality(@category_ids::uuid[]) = 0 and cardinality(@subcategory_ids::uuid[]) = 0)
    or category_id = any(@category_ids::uuid[])
    or subcategory_id = any(@subcategory_ids::uuid[])
  )
order by entry_date, position;
