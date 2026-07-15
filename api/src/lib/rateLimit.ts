import { ApiError } from './errors'

export function clientIp(request: Request): string {
  return request.headers.get('cf-connecting-ip') || 'unknown'
}

export function normalizeRateLimitEmail(email: string): string {
  return email.trim().toLowerCase()
}

export class RateLimitError extends ApiError {
  readonly retryAfterSec: number

  constructor(retryAfterSec: number) {
    super(429, 'Too many requests. Try again shortly.')
    this.retryAfterSec = Math.max(1, retryAfterSec)
  }
}

export async function enforceRateLimit(
  db: D1Database,
  input: { key: string; limit: number; windowMs: number },
): Promise<void> {
  const now = Date.now()
  const row = await db
    .prepare('SELECT count, reset_at FROM rate_limits WHERE key = ?')
    .bind(input.key)
    .first<{ count: number; reset_at: number }>()

  if (!row || row.reset_at <= now) {
    await db
      .prepare('INSERT OR REPLACE INTO rate_limits (key, count, reset_at) VALUES (?, 1, ?)')
      .bind(input.key, now + input.windowMs)
      .run()
    return
  }

  if (row.count >= input.limit) {
    throw new RateLimitError(Math.ceil((row.reset_at - now) / 1000))
  }

  await db
    .prepare('UPDATE rate_limits SET count = count + 1 WHERE key = ? AND reset_at = ?')
    .bind(input.key, row.reset_at)
    .run()
}

export function rejectOversizedRequestBody(request: Request, maxBytes: number): void {
  const raw = request.headers.get('content-length')
  if (!raw) return
  const length = Number(raw)
  if (!Number.isFinite(length) || length <= maxBytes) return
  throw new ApiError(413, 'Request body too large.')
}

export const rateLimitPolicy = {
  authLoginPerIp: { limit: 20, windowMs: 60_000 },
  authLoginPerEmail: { limit: 10, windowMs: 60_000 },
  authSignupPerIp: { limit: 5, windowMs: 60_000 },
  authSignupPerEmail: { limit: 3, windowMs: 3_600_000 },
  taskWritePerUser: { limit: 120, windowMs: 60_000 },
}
