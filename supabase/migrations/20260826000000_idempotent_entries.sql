-- Idempotent entry creation (#17): a create whose response is lost
-- mid-flight (timeout, not clean offline) retried as a second POST and
-- duplicated the Entry. The client now sends its draft id as an
-- idempotency key; the partial unique index lets InsertEntry arbiter on it
-- and hand back the original row instead of inserting another.
--
-- NULL for keyless clients (older builds), and NULLs never collide, so
-- only keyed creates are guarded. Scoped per Journal: two Users' devices
-- can generate the same key string without touching each other's Entries.
alter table entries add column idempotency_key text;

create unique index entries_journal_idempotency_key_idx
    on entries (journal_id, idempotency_key)
    where idempotency_key is not null;
