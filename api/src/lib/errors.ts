import { HTTPException } from 'hono/http-exception'

export class ApiError extends HTTPException {
  constructor(status: number, message: string) {
    super(status as 400, { message })
  }
}

export function badRequest(message: string): never {
  throw new ApiError(400, message)
}

export function unauthorized(message = 'Unauthorized'): never {
  throw new ApiError(401, message)
}

export function forbidden(message = 'Forbidden'): never {
  throw new ApiError(403, message)
}

export function notFound(message = 'Not found'): never {
  throw new ApiError(404, message)
}

export function isUniqueConstraintError(error: unknown): boolean {
  const msg = error instanceof Error ? error.message : String(error)
  return /UNIQUE constraint failed/i.test(msg) || /SQLITE_CONSTRAINT_UNIQUE/i.test(msg)
}
