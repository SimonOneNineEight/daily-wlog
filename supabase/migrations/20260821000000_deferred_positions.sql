-- Reorder support (#7): position uniqueness moves from INITIALLY IMMEDIATE
-- to INITIALLY DEFERRED. A day reorder is one UPDATE assigning every entry
-- its new position; immediate checking would trip on the transient
-- collisions mid-statement, deferred checking validates the final order at
-- commit.
alter table entries
    drop constraint entries_journal_id_entry_date_position_key,
    add constraint entries_journal_id_entry_date_position_key
        unique (journal_id, entry_date, position) deferrable initially deferred;
