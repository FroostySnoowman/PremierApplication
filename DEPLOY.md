# Deploy BLOK to Cloudflare (submission-ready)

## Current production

- **App:** https://blok-e7n.pages.dev
- **API:** https://blok-api.froosty.workers.dev

## 1. Cloudflare login

```bash
cd api
npx wrangler login
```

## 2. Create D1 and configure the Worker

```bash
npx wrangler d1 create blok-db
```

Copy the printed `database_id` into [`api/wrangler.toml`](./api/wrangler.toml).

Set production origins (Pages URL once you know it — you can update after first Pages deploy):

```toml
APP_ORIGIN = "https://YOUR_PROJECT.pages.dev,http://localhost:5173"
```

Apply migrations and set the JWT secret (32+ random characters):

```bash
npm run d1:migrate:remote
npx wrangler secret put AUTH_JWT_SECRET
npm run deploy
```

Note the Worker URL, e.g. `https://blok-api.<account>.workers.dev`.

## 3. Deploy the frontend (Pages)

```bash
cd ../frontend
npm install
```

Create a Pages project (dashboard or CLI):

```bash
VITE_API_URL=https://blok-api.<account>.workers.dev npm run build
npx wrangler pages deploy dist --project-name=blok
```

Or in the Cloudflare dashboard:

- Framework preset: Vite
- Build command: `npm run build`
- Output directory: `dist`
- Root directory: `frontend`
- Environment variable: `VITE_API_URL` = your Worker URL

## 4. Lock CORS

Update `api/wrangler.toml` `[vars].APP_ORIGIN` to include the exact Pages origin(s), then:

```bash
cd api
npm run deploy
```

## 5. Verify

1. Open the Pages URL
2. Register with a 12+ character password (letter + number)
3. Create a task, filter, Focus Mode, drag reorder
4. Allow notifications when prompted (deadline reminders)

## 6. Submission checklist

- [ ] Live app URL working
- [ ] API `/health` returns `{ "ok": true }`
- [ ] GitHub repo public with this README
- [ ] Root README “Live URL” section filled in
