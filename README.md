# fe-social-listening

Dashboard for Social Listening & Brand Intelligence: overview, mentions feed, competitor comparison (share of voice, net sentiment, daily volume), Excel upload, and the AI Brand Assistant. Talks to [be-social-listening](https://github.com/Creacon-Group/be-social-listening).

Stack: Next.js 16 (App Router) · React 19 · Tailwind 4 · SWR · Recharts · AI SDK (`@ai-sdk/react`) · Vercel Blob.

## How it connects to the backend

The browser only calls this app. `next.config.ts` rewrites `/api/*` to `API_URL`, so the backend's httpOnly auth cookie is first-party and no CORS is needed. `src/proxy.ts` sends visitors without the cookie to `/login`; the backend verifies the token on every request.

Dashboard filters (date range, channels, sentiments) live in the URL. Every page and the AI Assistant use the same filter, and presets count back from the latest data date (data arrives as monthly files).

## Local setup

Requires Node 20+ and npm 11. Run the backend first (port 3001).

```bash
cp .env.example .env.local
npm install
npm run dev        # http://localhost:3000
```

## Environment

| Variable | Where | Purpose |
|---|---|---|
| `API_URL` | server | Backend base URL, e.g. `https://be-social-listening.vercel.app` |
| `NEXT_PUBLIC_UPLOAD_MODE` | build | `direct` (default): multipart upload to the API, for local/VPS. `blob`: browser uploads to Vercel Blob first, required on Vercel because function bodies are capped at 4.5 MB |
| `BLOB_READ_WRITE_TOKEN` | server | Vercel Blob store token (blob mode). The backend needs the same token to read private blobs |

## Deploy on Vercel

1. Import the repo and set the variables above (`NEXT_PUBLIC_UPLOAD_MODE=blob`).
2. Create a Blob store in the project's Storage tab; Vercel adds `BLOB_READ_WRITE_TOKEN`. Copy it to the backend project too.
3. Deploy the backend in the same region (`sin1`).

## Pages

| Route | What it shows |
|---|---|
| `/projects/:id/overview` | Totals, sentiment split, volume per channel, share of voice |
| `/projects/:id/mentions` | Mentions feed: search, brand filter, sort, pagination |
| `/projects/:id/competitors` | SOV ribbon, per-brand table (volume, SOV, net sentiment, ratio), daily volume |
| `/projects/:id/assistant` | AI chat with saved sessions; answers use the active filter |
| `/projects/:id/upload` | Excel upload, batch progress (paused batches resume automatically), failed rows, unmapped keywords |
