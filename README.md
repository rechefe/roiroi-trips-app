# מתכנן ציוד לטיולים (Trip Gear Planner)

A PWA for building gear checklists for trips in Israel, managing gear inventory and saved trips.

- Profiles, personal inventory, and non-shared trips live only on-device (`localStorage`) — by design, that's private data with no reason to leave the phone.
- Trips a user explicitly **shares** with friends are persisted server-side in a **Vercel Postgres** database (via `@vercel/postgres`, see `api/`), keyed by a random 6-character code. Sharing also produces a real clickable link (`?trip=CODE`) that auto-joins the trip when opened, in addition to the manually-typed code.

## Structure

- `trip-gear-planner.html` — the app (single-page frontend)
- `api/trips/index.js` — `POST` creates a shared trip, returns its code
- `api/trips/[code].js` — `GET` fetches a shared trip, `PATCH` updates its packed state / name
- `api/_db.js` — shared DB helpers (table creation, code generation)
- `manifest.json` — PWA manifest
- `sw.js` — service worker (offline app-shell cache)
- `assets/` — icons and background images

## Database setup (one-time)

The app expects a Postgres database connected via Vercel's storage integration:

1. In the Vercel dashboard, open this project → **Storage** tab → **Create Database** → **Postgres** (Neon).
2. Connect it to the project — Vercel automatically injects the `POSTGRES_URL` (and related) environment variables into all environments (Production/Preview/Development).
3. Redeploy. The `trips` table is created automatically on first API call (`CREATE TABLE IF NOT EXISTS`) — no manual migration needed.

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
