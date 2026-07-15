import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { HTTPException } from 'hono/http-exception'
import { ZodError } from 'zod'
import type { Bindings } from './lib/env'
import { ApiError } from './lib/errors'
import { RateLimitError } from './lib/rateLimit'
import { isTrustedAppOrigin } from './lib/requestOrigin'
import type { AuthContext } from './middleware/requireAuth'
import { registerAuthRoutes } from './routes/auth'
import { registerTaskRoutes } from './routes/tasks'

export type AppEnv = { Bindings: Bindings; Variables: { auth: AuthContext } }

const SECURITY_HEADERS: Record<string, string> = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()',
  'Cache-Control': 'no-store',
}

export function createApp() {
  const app = new Hono<AppEnv>()

  app.use('*', (c, next) =>
    cors({
      origin: (origin) => {
        if (!origin) return null
        return isTrustedAppOrigin(origin, c.env) ? origin : null
      },
      credentials: true,
      allowHeaders: ['Content-Type', 'Authorization', 'Accept'],
      allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    })(c, next),
  )

  app.use('*', async (c, next) => {
    await next()
    if (c.res.status === 101) return
    for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
      if (!c.res.headers.has(key)) {
        try {
          c.res.headers.set(key, value)
        } catch {
          void 0
        }
      }
    }
    if (c.req.url.startsWith('https://') && !c.res.headers.has('Strict-Transport-Security')) {
      try {
        c.res.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
      } catch {
        void 0
      }
    }
  })

  app.get('/health', (c) => c.json({ ok: true }))

  registerAuthRoutes(app)
  registerTaskRoutes(app)

  app.onError((err, c) => {
    if (err instanceof RateLimitError) {
      c.header('Retry-After', String(err.retryAfterSec))
      return c.json({ error: err.message }, 429)
    }
    if (err instanceof ApiError || err instanceof HTTPException) {
      return c.json({ error: err.message }, err.status)
    }
    if (err instanceof ZodError) {
      const first = err.issues[0]
      return c.json({ error: first?.message ?? 'Invalid request' }, 400)
    }
    console.error('[api]', err)
    return c.json({ error: 'Internal server error' }, 500)
  })

  app.notFound((c) => c.json({ error: 'Not found' }, 404))

  return app
}
