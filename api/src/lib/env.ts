export type Bindings = {
  DB: D1Database
  APP_ORIGIN: string
  AUTH_JWT_SECRET: string
  AUTH_COOKIE_NAME?: string
}

export function requiredEnv(value: string | undefined, key: string): string {
  if (!value) throw new Error(`Missing required env var: ${key}`)
  return value
}

export function requireStrongJwtSecret(env: Bindings): string {
  const secret = requiredEnv(env.AUTH_JWT_SECRET, 'AUTH_JWT_SECRET')
  if (secret.length < 32) {
    throw new Error('AUTH_JWT_SECRET must be at least 32 characters')
  }
  return secret
}
