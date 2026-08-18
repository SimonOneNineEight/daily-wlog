-- name: ListMonthDots :many
-- One row per entry in the month, date-then-position order; the handler
-- groups rows into days. Only structure leaves the database — dots need
-- categories, never content (ADR-0004).
select
    to_char(entry_date, 'YYYY-MM-DD') as entry_date,
    category_id
from entries
where journal_id = @journal_id::uuid
  and entry_date >= @first_day::date
  and entry_date < @next_month::date
order by entry_date, position;
