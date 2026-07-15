import type { Bindings } from './env'

export function configuredAppOrigins(raw: string | undefined): string[] {
  return (raw ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)
}

export function isTrustedAppOrigin(origin: string | null | undefined, env: Bindings): boolean {
  if (!origin) return false
  const allowed = configuredAppOrigins(env.APP_ORIGIN)
  if (allowed.includes(origin)) return true

  try {
    const url = new URL(origin)
    if (url.protocol !== 'https:') return false
    const host = url.hostname.toLowerCase()
    for (const entry of allowed) {
      try {
        const allowedHost = new URL(entry).hostname.toLowerCase()
        if (!allowedHost.endsWith('.pages.dev')) continue
        if (host === allowedHost || host.endsWith(`.${allowedHost}`)) return true
      } catch {
        void 0
      }
    }
  } catch {
    return false
  }

  return false
}
