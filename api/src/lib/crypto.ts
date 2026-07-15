const encoder = new TextEncoder()

function toBase64Url(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes))
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replaceAll('=', '')
}

function fromBase64Url(value: string): Uint8Array {
  const padded = value.replaceAll('-', '+').replaceAll('_', '/') + '='.repeat((4 - (value.length % 4)) % 4)
  const decoded = atob(padded)
  return Uint8Array.from(decoded, (c) => c.charCodeAt(0))
}

export function randomToken(bytes = 32): string {
  const out = new Uint8Array(bytes)
  crypto.getRandomValues(out)
  return toBase64Url(out)
}

export async function hashPassword(password: string): Promise<string> {
  const iterations = 100_000
  const salt = new Uint8Array(16)
  crypto.getRandomValues(salt)
  const keyMaterial = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits'])
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt, iterations },
    keyMaterial,
    256,
  )
  return `pbkdf2$${iterations}$${toBase64Url(salt)}$${toBase64Url(new Uint8Array(bits))}`
}

export async function verifyPassword(password: string, encodedHash: string): Promise<boolean> {
  const [algo, iterationStr, saltStr, hashStr] = encodedHash.split('$')
  if (algo !== 'pbkdf2' || !iterationStr || !saltStr || !hashStr) return false
  const iterations = Number(iterationStr)
  if (!Number.isFinite(iterations) || iterations < 1 || iterations > 100_000) return false
  const salt = fromBase64Url(saltStr)
  const keyMaterial = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits'])
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt, iterations },
    keyMaterial,
    256,
  )
  const computed = toBase64Url(new Uint8Array(bits))
  const a = encoder.encode(computed)
  const b = encoder.encode(hashStr)
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i += 1) diff |= a[i]! ^ b[i]!
  return diff === 0
}

let dummyHashPromise: Promise<string> | null = null

export function dummyPasswordHash(): Promise<string> {
  if (!dummyHashPromise) {
    dummyHashPromise = hashPassword('blok-timing-oracle-dummy-value')
  }
  return dummyHashPromise
}
