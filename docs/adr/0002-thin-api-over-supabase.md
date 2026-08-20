# Thin custom API in front of Supabase

The mobile app never talks to Supabase directly: all traffic goes through a thin API (our code — language decided in ADR-0003), which uses Supabase for Postgres, auth verification, and photo storage. Supabase's client-direct model with row-level security was rejected because business rules (storage quotas, category auto-creation, reminder logic, AI jobs) need one home that isn't spread across RLS policies and client code; a fully custom backend was rejected because auth, session security, and file storage are dangerous to hand-roll and are not this product's differentiator. The layer also means any underlying piece (photo storage economics at scale, background AI/PDF workers) can be swapped later without touching shipped clients.

## Amendment (2026-08, issue #8): media bytes bypass the API

Photo *bytes* are the one exception to "all traffic goes through the API".
The client uploads and downloads them directly against storage using
short-lived presigned URLs that only the API can mint. The API remains the
sole control plane — presign, register, delete, reorder — so the business
rules stay in one home; routing multi-megabyte media through the API would
double bandwidth without adding a rule it needs to enforce. Swappability is
preserved: clients only ever see URLs the API handed them, never storage
credentials or bucket layout.
