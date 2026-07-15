import type { Bindings } from './env'
import { forbidden } from './errors'
import { isTrustedAppOrigin } from './requestOrigin'

const CSRF_SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS'])

export function assertCsrfSafe(request: Request, env: Bindings): void {
  if (CSRF_SAFE_METHODS.has(request.method.toUpperCase())) return

  const authorization = request.headers.get('authorization')
  if (authorization && /^bearer\s+\S/i.test(authorization)) return

  const origin = request.headers.get('origin')
  if (!origin) forbidden('Missing Origin header')
  if (!isTrustedAppOrigin(origin, env)) forbidden('Cross-origin request blocked')
}
