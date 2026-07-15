import { SignJWT, jwtVerify } from 'jose'
import type { Bindings } from './env'
import { requireStrongJwtSecret } from './env'

const encoder = new TextEncoder()
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7

type SessionClaims = {
  sid: string
}

function cookieNames(env: Bindings): string[] {
  const base = env.AUTH_COOKIE_NAME || 'blok_session'
  return [`__Host-${base}`, `__Secure-${base}`, base]
}

export function sessionTokenFromHeaders(headers: Headers, env: Bindings): string | null {
  const authorization = headers.get('authorization')
  if (authorization) {
    const [scheme, token] = authorization.split(/\s+/, 2)
    if (scheme?.toLowerCase() === 'bearer' && token) return token
  }

  const cookieHeader = headers.get('cookie')
  if (!cookieHeader) return null
  const wanted = new Set(cookieNames(env))
  for (const part of cookieHeader.split(';')) {
    const trimmed = part.trim()
    const eq = trimmed.indexOf('=')
    if (eq <= 0) continue
    const name = trimmed.slice(0, eq)
    if (wanted.has(name)) return trimmed.slice(eq + 1)
  }
  return null
}

async function secretKey(env: Bindings): Promise<CryptoKey> {
  const secret = requireStrongJwtSecret(env)
  return crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify'])
}

export async function signSessionJwt(env: Bindings, userId: string, sid: string): Promise<string> {
  const key = await secretKey(env)
  return new SignJWT({ sid } as SessionClaims)
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(key)
}

export async function verifySessionJwt(env: Bindings, token: string): Promise<{ userId: string; sid: string } | null> {
  try {
    const key = await secretKey(env)
    const { payload } = await jwtVerify<SessionClaims>(token, key, { algorithms: ['HS256'] })
    if (!payload.sub || !payload.sid) return null
    return { userId: payload.sub, sid: payload.sid }
  } catch {
    return null
  }
}

export { SESSION_TTL_SECONDS }
