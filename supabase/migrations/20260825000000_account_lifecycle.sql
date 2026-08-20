-- Account lifecycle (#15): deactivation is a timestamp, purge is physical
-- deletion after the 30-day grace, and the audit trail survives both.

alter table users add column deleted_at timestamptz;

-- No FK back to users on purpose: the trail must outlive the purge.
create table account_audit (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null,
    event text not null check (event in ('deactivated', 'reactivated', 'purged')),
    at timestamptz not null default now(),
    scope jsonb
);

alter table account_audit enable row level security;
