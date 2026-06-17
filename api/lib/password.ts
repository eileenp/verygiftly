// PBKDF2 password hashing via Web Crypto API — works in Cloudflare Workers and Node.js
// Stored format: pbkdf2:{iterations}:{saltHex}:{hashHex}

const ITERATIONS = 100_000

function toHex(buf: ArrayBuffer | Uint8Array): string {
  const arr = buf instanceof Uint8Array ? buf : new Uint8Array(buf)
  return Array.from(arr)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

function fromHex(hex: string): Uint8Array {
  const bytes: number[] = []
  for (let i = 0; i < hex.length; i += 2) {
    bytes.push(parseInt(hex.slice(i, i + 2), 16))
  }
  return new Uint8Array(bytes)
}

// Constant-time string comparison — avoids leaking match progress via timing.
export function timingSafeEqualString(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return diff === 0
}

async function deriveKey(password: string, salt: Uint8Array, iterations: number): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits'],
  )
  const hashBuf = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt, iterations },
    key,
    256,
  )
  return toHex(hashBuf)
}

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const hash = await deriveKey(password, salt, ITERATIONS)
  return `pbkdf2:${ITERATIONS}:${toHex(salt)}:${hash}`
}

export async function verifyPassword(plaintext: string, stored: string): Promise<boolean> {
  if (!stored.startsWith('pbkdf2:')) {
    // Legacy plaintext — exact match only (constant-time)
    return timingSafeEqualString(stored, plaintext)
  }
  const parts = stored.split(':')
  if (parts.length !== 4) return false
  const [, iterStr, saltHex, storedHash] = parts
  const iterations = parseInt(iterStr, 10)
  if (!Number.isFinite(iterations) || iterations < 1) return false
  const salt = fromHex(saltHex)
  const hash = await deriveKey(plaintext, salt, iterations)
  return timingSafeEqualString(hash, storedHash)
}
