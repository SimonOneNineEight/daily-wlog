# TestFlight release runbook (#16)

The path from this repo to a TestFlight link a friend can tap. Steps marked
**Simon** need his accounts; everything else is agent-runnable once those
exist.

## One-time setup

1. **Simon — Apple Developer Program** (developer.apple.com, $99/yr).
   Approval usually takes 1–2 days. Unblocks TestFlight and Sign in with
   Apple (App Store review requires Apple sign-in because we offer Google).
2. **Simon — hosted Supabase project** (supabase.com, free tier).
   Do not paste keys into the repo or the chat; they go into EAS/hosting
   secret stores in step 4.
3. **Simon — decide the API host.** The Go API needs a home; Supabase does
   not run it. Candidates (all fine at this scale): Fly.io, Railway,
   Render. Needs: one small container, `DATABASE_URL`,
   `SUPABASE_JWKS_URL`, `SUPABASE_STORAGE_URL`, `SUPABASE_SECRET_KEY`
   env vars, and a daily scheduled run of `cmd/purge` (#15) — Fly machines
   cron, Railway cron, or a GitHub Actions schedule hitting the same image.
4. **Wire secrets.**
   - Hosted Supabase: apply `supabase/migrations/` via `supabase link` +
     `supabase db push`; create the private `photos` bucket per
     `supabase/config.toml` (10MiB, image/jpeg).
   - API host: the four env vars above, from the hosted project's settings.
   - EAS: `eas env:create` for `EXPO_PUBLIC_SUPABASE_URL`,
     `EXPO_PUBLIC_SUPABASE_KEY` (publishable key only — never the secret),
     `EXPO_PUBLIC_API_URL` (the deployed API's URL).
5. **Auth providers** (Supabase dashboard → Authentication): enable Apple
   (needs the Developer account's key) and Google (the OAuth client ids
   tracked on closed #4).

## Per-release

```sh
cd apps/mobile
eas build --platform ios --profile production
eas submit --platform ios
```

Then App Store Connect → TestFlight → add testers (internal, up to 100, no
review) or create an external group (light beta review, shareable link).

## Already in the repo

- `apps/mobile/eas.json` — development / preview / production profiles.
- `apps/mobile/app.json` — bundle id `com.simononenineeight.dailywlog`
  (changeable until the first upload), light-only UI, zh_TW region,
  camera/photo permission copy, Apple sign-in capability, placeholder icon
  (the app's + mark; replace when a real identity exists).
- `api/cmd/purge` — the 30-day account purge binary for step 3's schedule.

## App Store privacy questionnaire (answer truthfully)

Data collected, linked to identity:
- **User content**: journal entries (encrypted blobs server-side, not
  parsed — ADR-0004), photos. Purpose: app functionality. Not used for
  tracking, not shared with third parties.
- **Identifiers / contact info**: account id and email (via Apple/Google
  sign-in through Supabase Auth). Purpose: app functionality.
- No analytics SDK, no advertising, no tracking. Sentry collects crash
  data (not linked to identity beyond what a crash trace carries).
- Account deletion: in-app (設定 → 刪除帳號), 30-day grace, then permanent
  purge — App Store guideline 5.1.1(v) satisfied.

## Still open before external testers

- Privacy policy + terms documents (the deferred settings rows, and App
  Store Connect wants a privacy policy URL).
- Replace the placeholder icon if a real identity lands first.
- Motion pass, second half: press states shipped (theme/press.tsx), but
  the 150ms selection, 240ms content-swap, and 300ms screen-push token
  timings are unimplemented — route changes are instant cuts. Sheets and
  the month pager ride native timings.
