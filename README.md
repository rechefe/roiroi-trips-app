# מתכנן ציוד לטיולים (Trip Gear Planner)

A static PWA for building gear checklists for trips in Israel, managing gear inventory and saved trips. Data syncs via Firebase Firestore.

## Structure

- `trip-gear-planner.html` — the app (single-page, no build step)
- `manifest.json` — PWA manifest
- `sw.js` — service worker (offline app-shell cache)
- `assets/` — icons and background images

## Local preview

No build step is required. Serve the folder with any static file server, e.g.:

```bash
npx serve .
```

Then open `http://localhost:3000/`.

## Deployment

This project is a static site and deploys as-is on [Vercel](https://vercel.com). See the deployment guide provided with this project for step-by-step instructions.
