# מתכנן ציוד לטיולים (Trip Gear Planner)

A PWA for building gear checklists for trips in Israel, managing gear inventory and saved trips.

- `localStorage` is only a fast, offline-first **cache** now — the only thing that has to survive on-device is the profile name you type in. Everything else (inventory, custom items, and every trip you own or joined) is mirrored to a **Vercel Postgres** database keyed by that name (lowercased), so switching devices or clearing browser data restores it all. There's no password — this is a low-friction identifier, the same trust model as the trip share codes below, not an account system.
- Trips a user explicitly **shares** with friends additionally get a random 6-character code and live in their own `trips` table row: a joint trip tracks the list of usernames who joined (`participants`), and every joint item's checked state records **who** checked it (`packed[itemId] = {by, at}`), not just a boolean. The trip is polled every few seconds so everyone's checked/unchecked items and the participant list stay in sync. Sharing produces a real clickable link (`?trip=CODE`) that auto-joins the trip when opened, in addition to the manually-typed code.
- **No double-booking:** checking a joint item is an atomic claim on the server (`POST /api/trips/[code]/item`) — a `WHERE NOT (packed ? itemId)` conditional update — so if two people press the same checkbox at nearly the same moment, only the first one wins; the loser's request comes back as a conflict and their UI updates to show who actually got it. Once an item is claimed, everyone else sees its checkbox disabled with the claimer's name next to it, so in practice you usually can't even press an already-taken item.
- Personal items on a group trip (gear that's private to you, e.g. your own headlamp) are never sent to the shared `trips` table at all — they live next to the trip's `shareCode` on the user's own account row (`user_trips.personal_packed`), the same place non-shared/personal trips store their full item list.

## Structure

- `trip-gear-planner.html` — the app (single-page frontend)
- `api/trips/index.js` — `POST` creates a shared trip (optionally seeding the creator as a participant), returns its code
- `api/trips/[code].js` — `GET` fetches a shared trip (including its `participants`), `PATCH` updates its name / does a full packed-state reset
- `api/trips/[code]/item.js` — `POST` atomically claims or releases a single joint item, returning a 409 conflict (with the current holder) if someone else got there first
- `api/trips/[code]/join.js` — `POST` idempotently registers a username as a trip participant
- `api/_db.js` — DB helpers for the shared-trip live-sync table (table creation, code generation)
- `api/account/[username].js` — `GET`/`PUT` a profile's full snapshot (inventory, custom items, all trips), keyed by lowercased profile name
- `api/_account_db.js` — DB helpers for the `accounts` / `user_trips` tables
- `manifest.json` — PWA manifest
- `sw.js` — service worker (offline app-shell cache; network-first for the HTML so new deployments show up immediately, and `/api/*` is never cached)
- `assets/` — icons and background images

## Database setup (one-time)

The app expects a Postgres database connected via Vercel's storage integration:

1. In the Vercel dashboard, open this project → **Storage** tab → **Create Database** → **Postgres** (Neon).
2. Connect it to the project — Vercel automatically injects the `POSTGRES_URL` (and related) environment variables into all environments (Production/Preview/Development).
3. Redeploy. All tables (`trips`, `accounts`, `user_trips`) are created automatically on first API call (`CREATE TABLE IF NOT EXISTS`) — no manual migration needed.

Known limitation: renaming a profile changes its sync key (the name *is* the username), so data won't follow a rename to the new name automatically.

## Local preview

Install dependencies once (needed for the `/api` functions):

```bash
npm install
```

Run with the Vercel CLI so both the static page and the `/api` serverless functions work, and pull the database env vars down locally:

```bash
npx vercel link   # first time only, links this folder to the Vercel project
npx vercel env pull .env.local
npx vercel dev
```

Then open `http://localhost:3000/`.

(Serving the folder with a plain static server like `npx serve .` still works for UI-only changes, but trip sharing/joining needs the API routes and won't function without `vercel dev`.)

## Deployment

This project deploys on [Vercel](https://vercel.com), combining the static page with the `/api` serverless functions and the connected Postgres database. Push to the deployed branch and Vercel builds/deploys automatically.
