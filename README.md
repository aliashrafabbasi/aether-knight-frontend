# Aether Knight Frontend

React + TypeScript client for the Aether Knight voice AI assistant.

## Quick start

```bash
cp .env.example .env
npm install
npm run dev
```

App runs at `http://localhost:5173`.

**Backend** must be running (configure via `VITE_API_URL` in `.env`).

## Deploy to Netlify

1. Connect this repo to Netlify
2. Build settings (auto-detected from `netlify.toml`):
   - **Build command:** `npm run build`
   - **Publish directory:** `dist`
3. Add environment variable: `VITE_API_URL` = your production API URL
4. Deploy

SPA routing is handled via `netlify.toml` and `public/_redirects` so `/login`, `/home`, `/admin`, etc. work on refresh.

## Routes

| Path | Page |
|------|------|
| `/login`, `/register` | Auth |
| `/home` | Dashboard |
| `/voice/:sessionId` | Voice room |
| `/admin` | User management (admin only) |
