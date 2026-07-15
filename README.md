# BLOK

Dark neubrutalist task manager — register, plan, drag to reorder, drop into Focus Mode, and get deadline reminders.

| Layer | Path | Host |
|--------|------|------|
| Frontend | [`frontend/`](./frontend/) | Cloudflare Pages (React + Vite + TypeScript) |
| API | [`api/`](./api/) | Cloudflare Workers + D1 |

Deploy guide: [`DEPLOY.md`](./DEPLOY.md)

## Features

- Secure accounts: PBKDF2 (100k), JWT + D1 sessions, HttpOnly `__Host-` cookies on HTTPS, strict Origin CSRF, D1-backed rate limits, anti-enumeration login
- Tasks: title, description, due date, priority
- Filters: All / Active / Completed
- Drag-and-drop reorder
- Immersive Focus Mode (no chrome) with 25-minute countdown
- Browser deadline notifications (due soon / overdue)
- Responsive dark neubrutalism UI

## Local setup

### Prerequisites

- Node.js 20+
- Cloudflare account (for deploy)

### 1. API

```bash
cd api
npm install
cp .dev.vars.example .dev.vars
npm run d1:migrate:local
npm run dev
```

API: `http://localhost:8787`

### 2. Frontend

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

App: `http://localhost:5173`

Set `AUTH_JWT_SECRET` to at least 32 characters in `api/.dev.vars`, and `VITE_API_URL=http://localhost:8787` in `frontend/.env`.

Passwords require **12+ characters**, including a letter and a number.

## Security highlights

- Cookie sessions only reachable via trusted `APP_ORIGIN` (CSRF)
- Ownership checks on every task query (no IDOR)
- Durable rate limits in D1 (survive isolate restarts)
- Login uses constant-cost password verify (timing-safe against user enumeration)
- Security headers on API + Pages (`_headers` CSP, frame deny, nosniff, HSTS)

## Live URL

- **App:** https://blok-e7n.pages.dev
- **API:** https://blok-api.froosty.workers.dev

## Project layout

```
frontend/     React SPA
api/          Hono Worker + D1 migrations
DEPLOY.md     Cloudflare deploy steps
```
