import type { MiddlewareHandler } from 'hono'
import type { Bindings } from '../lib/env'
import { assertCsrfSafe } from '../lib/csrf'
import { nowIso } from '../lib/db'
import { unauthorized } from '../lib/errors'
import { sessionTokenFromHeaders, verifySessionJwt } from '../lib/session'

export type AuthContext = {
  userId: string
  sessionId: string
}

export async function authenticateRequest(request: Request, env: Bindings): Promise<AuthContext> {
  const token = sessionTokenFromHeaders(request.headers, env)
  if (!token) unauthorized()
  const claims = await verifySessionJwt(env, token)
  if (!claims) unauthorized()
  const session = await env.DB.prepare(
    'SELECT id, user_id, expires_at FROM sessions WHERE id = ? AND user_id = ?',
  )
    .bind(claims.sid, claims.userId)
    .first<{ id: string; user_id: string; expires_at: string }>()
  if (!session || new Date(session.expires_at).getTime() <= Date.now()) {
    if (session) {
      await env.DB.prepare('DELETE FROM sessions WHERE id = ?').bind(session.id).run()
    }
    unauthorized()
  }
  const user = await env.DB.prepare('SELECT id FROM users WHERE id = ?').bind(claims.userId).first<{ id: string }>()
  if (!user) unauthorized()

  try {
    await env.DB.prepare('UPDATE sessions SET last_seen_at = ? WHERE id = ?').bind(nowIso(), session.id).run()
  } catch {
    void 0
  }

  return { userId: claims.userId, sessionId: claims.sid }
}

export const requireAuth: MiddlewareHandler<{ Bindings: Bindings; Variables: { auth: AuthContext } }> = async (
  c,
  next,
) => {
  assertCsrfSafe(c.req.raw, c.env)
  c.set('auth', await authenticateRequest(c.req.raw, c.env))
  await next()
}
