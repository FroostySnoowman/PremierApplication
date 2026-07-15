# BLOK API

Cloudflare Worker + D1 backend for BLOK.

## Stack

- Hono on Cloudflare Workers
- D1 (SQLite) for users, sessions, tasks, rate limits
- JWT sessions in HttpOnly cookies (`jose`)
- PBKDF2 password hashing (100k iterations)
- Zod validation, strict Origin CSRF, D1 rate limits

## Setup

```bash
cd api
npm install
cp .dev.vars.example .dev.vars
```

Set `AUTH_JWT_SECRET` to at least 32 characters in `.dev.vars`.

Create D1:

```bash
npx wrangler login
npx wrangler d1 create blok-db
```

Paste `database_id` into [`wrangler.toml`](./wrangler.toml). Set `APP_ORIGIN` to your frontend origin(s).

```bash
npm run d1:migrate:local
npm run d1:migrate:remote
npx wrangler secret put AUTH_JWT_SECRET
npm run dev
npm run deploy
```

## Auth & tasks

| Method | Path | Notes |
|--------|------|--------|
| POST | `/auth/register` | `{ name, email, password }` — password ≥ 12, letter + number |
| POST | `/auth/login` | revokes prior sessions |
| POST | `/auth/logout` | clears session |
| GET | `/auth/me` | current user |
| GET | `/tasks?filter=` | `all` \| `active` \| `completed` |
| GET | `/tasks/:id` | single owned task |
| POST | `/tasks` | create |
| PATCH | `/tasks/:id` | update |
| DELETE | `/tasks/:id` | delete |
| PUT | `/tasks/reorder` | `{ orderedIds: string[] }` |

All cookie mutations require a trusted `Origin` matching `APP_ORIGIN`.
