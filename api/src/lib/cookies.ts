import { setCookie } from 'hono/cookie'
import type { Bindings } from './env'
import { SESSION_TTL_SECONDS } from './session'

type CookieCtx = {
  req: { url: string }
  env: Bindings
}

export function authCookieName(env: Bindings, secure: boolean): string {
  const base = env.AUTH_COOKIE_NAME || 'blok_session'
  if (secure && !base.startsWith('__Host-') && !base.startsWith('__Secure-')) {
    return `__Host-${base}`
  }
  return base
}

export function setAuthCookie(c: CookieCtx, jwt: string): void {
  const secure = c.req.url.startsWith('https://')
  setCookie(c as never, authCookieName(c.env, secure), jwt, {
    httpOnly: true,
    secure,
    sameSite: secure ? 'None' : 'Lax',
    path: '/',
    maxAge: SESSION_TTL_SECONDS,
  })
}

export function clearAuthCookie(c: CookieCtx): void {
  const secure = c.req.url.startsWith('https://')
  const name = authCookieName(c.env, secure)
  setCookie(c as never, name, '', {
    httpOnly: true,
    secure,
    sameSite: secure ? 'None' : 'Lax',
    path: '/',
    maxAge: 0,
  })
  const base = c.env.AUTH_COOKIE_NAME || 'blok_session'
  if (name !== base) {
    setCookie(c as never, base, '', {
      httpOnly: true,
      secure,
      sameSite: secure ? 'None' : 'Lax',
      path: '/',
      maxAge: 0,
    })
  }
}
