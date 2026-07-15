import { Hono } from 'hono'
import { z } from 'zod'
import { clearAuthCookie, setAuthCookie } from '../lib/cookies'
import { assertCsrfSafe } from '../lib/csrf'
import type { Bindings } from '../lib/env'
import { addMinutesIso, nowIso, type DbUser } from '../lib/db'
import { dummyPasswordHash, hashPassword, randomToken, verifyPassword } from '../lib/crypto'
import { badRequest, isUniqueConstraintError, unauthorized } from '../lib/errors'
import { passwordSchema } from '../lib/passwordPolicy'
import {
  clientIp,
  enforceRateLimit,
  normalizeRateLimitEmail,
  rateLimitPolicy,
  rejectOversizedRequestBody,
} from '../lib/rateLimit'
import { sessionTokenFromHeaders, signSessionJwt, verifySessionJwt } from '../lib/session'
import { requireAuth, type AuthContext } from '../middleware/requireAuth'

type App = Hono<{ Bindings: Bindings; Variables: { auth: AuthContext } }>

const registerSchema = z.object({
  email: z.email().transform((v) => v.toLowerCase().trim()),
  name: z.string().trim().min(1).max(80),
  password: passwordSchema,
})

const loginSchema = z.object({
  email: z.email().transform((v) => v.toLowerCase().trim()),
  password: z.string().min(1).max(128),
})

async function getUserByEmail(db: D1Database, email: string): Promise<DbUser | null> {
  return (
    (await db.prepare('SELECT * FROM users WHERE lower(email) = ?').bind(email.toLowerCase().trim()).first<DbUser>()) ??
    null
  )
}

async function createSession(env: Bindings, userId: string, revokeOthers: boolean): Promise<string> {
  if (revokeOthers) {
    await env.DB.prepare('DELETE FROM sessions WHERE user_id = ?').bind(userId).run()
  }
  const sessionId = randomToken(24)
  const expiresAt = addMinutesIso(60 * 24 * 7)
  const now = nowIso()
  await env.DB.prepare(
    'INSERT INTO sessions (id, user_id, expires_at, created_at, last_seen_at) VALUES (?, ?, ?, ?, ?)',
  )
    .bind(sessionId, userId, expiresAt, now, now)
    .run()
  return signSessionJwt(env, userId, sessionId)
}

function publicUser(user: DbUser) {
  return { id: user.id, email: user.email, name: user.name }
}

export function registerAuthRoutes(app: App): void {
  app.post('/auth/register', async (c) => {
    rejectOversizedRequestBody(c.req.raw, 16_000)
    assertCsrfSafe(c.req.raw, c.env)
    await enforceRateLimit(c.env.DB, {
      key: `auth:signup:ip:${clientIp(c.req.raw)}`,
      ...rateLimitPolicy.authSignupPerIp,
    })
    const body = registerSchema.parse(await c.req.json())
    const email = normalizeRateLimitEmail(body.email)
    await enforceRateLimit(c.env.DB, {
      key: `auth:signup:email:${email}`,
      ...rateLimitPolicy.authSignupPerEmail,
    })

    const existing = await getUserByEmail(c.env.DB, body.email)
    if (existing) {
      await dummyPasswordHash().then((h) => verifyPassword(body.password, h))
      badRequest('Unable to create account with these details')
    }

    const id = crypto.randomUUID()
    const passwordHash = await hashPassword(body.password)
    const now = nowIso()
    try {
      await c.env.DB.prepare(
        'INSERT INTO users (id, email, password_hash, name, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
      )
        .bind(id, body.email, passwordHash, body.name, now, now)
        .run()
    } catch (error) {
      if (isUniqueConstraintError(error)) badRequest('Unable to create account with these details')
      throw error
    }

    const jwt = await createSession(c.env, id, false)
    setAuthCookie(c, jwt)
    const user = await c.env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(id).first<DbUser>()
    if (!user) badRequest('Unable to create account with these details')
    return c.json({ ok: true, user: publicUser(user) })
  })

  app.post('/auth/login', async (c) => {
    rejectOversizedRequestBody(c.req.raw, 8_000)
    assertCsrfSafe(c.req.raw, c.env)
    await enforceRateLimit(c.env.DB, {
      key: `auth:login:ip:${clientIp(c.req.raw)}`,
      ...rateLimitPolicy.authLoginPerIp,
    })
    const body = loginSchema.parse(await c.req.json())
    const email = normalizeRateLimitEmail(body.email)
    await enforceRateLimit(c.env.DB, {
      key: `auth:login:email:${email}`,
      ...rateLimitPolicy.authLoginPerEmail,
    })

    const user = await getUserByEmail(c.env.DB, body.email)
    const hash = user?.password_hash ?? (await dummyPasswordHash())
    const valid = await verifyPassword(body.password, hash)
    if (!user || !valid) unauthorized('Invalid credentials')

    const jwt = await createSession(c.env, user.id, true)
    setAuthCookie(c, jwt)
    return c.json({ ok: true, user: publicUser(user) })
  })

  app.post('/auth/logout', async (c) => {
    assertCsrfSafe(c.req.raw, c.env)
    const token = sessionTokenFromHeaders(c.req.raw.headers, c.env)
    if (token) {
      const claims = await verifySessionJwt(c.env, token)
      if (claims) await c.env.DB.prepare('DELETE FROM sessions WHERE id = ?').bind(claims.sid).run()
    }
    clearAuthCookie(c)
    return c.json({ ok: true })
  })

  app.get('/auth/me', requireAuth, async (c) => {
    const auth = c.get('auth')
    const user = await c.env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(auth.userId).first<DbUser>()
    if (!user) unauthorized()
    return c.json({ user: publicUser(user) })
  })
}
