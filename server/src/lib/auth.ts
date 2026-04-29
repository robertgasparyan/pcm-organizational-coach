import jwt from 'jsonwebtoken'
import type { Request, Response, NextFunction } from 'express'
import { getPrisma } from './prisma'

const JWT_SECRET = process.env.JWT_SECRET ?? 'pcm-fallback-secret'

export interface JWTPayload {
  userId: string
  email: string
  roles: string[]
  orgId: string | null
  tokenVersion: number
}

export function signToken(payload: JWTPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' })
}

export function verifyToken(token: string): JWTPayload {
  return jwt.verify(token, JWT_SECRET) as JWTPayload
}

// ── In-memory auth cache (60s TTL) ───────────────────────────────────────────
// Avoids a DB round-trip on every request while still enforcing deactivation
// within ~60 seconds of the status change.
interface CacheEntry {
  status: string
  tokenVersion: number
  cachedAt: number
  lastSeenUpdatedAt?: number
}
const authCache = new Map<string, CacheEntry>()
const CACHE_TTL_MS = 60_000

export function invalidateAuthCache(userId: string) {
  authCache.delete(userId)
}

async function checkUserValid(userId: string, payloadVersion: number): Promise<boolean> {
  const now = Date.now()
  const cached = authCache.get(userId)
  if (cached && now - cached.cachedAt < CACHE_TTL_MS) {
    const isValid = cached.status === 'active' && cached.tokenVersion === payloadVersion
    if (isValid) {
      const shouldUpdate = !cached.lastSeenUpdatedAt || now - cached.lastSeenUpdatedAt > 5 * 60 * 1000
      if (shouldUpdate) {
        cached.lastSeenUpdatedAt = now
        getPrisma().user.update({ where: { id: userId }, data: { lastSeenAt: new Date() } }).catch(() => {})
      }
    }
    return isValid
  }

  const user = await getPrisma().user.findUnique({
    where: { id: userId },
    select: { status: true, tokenVersion: true },
  })
  if (!user) return false

  const entry: CacheEntry = { status: user.status, tokenVersion: user.tokenVersion, cachedAt: now }
  authCache.set(userId, entry)

  const isValid = user.status === 'active' && user.tokenVersion === payloadVersion
  if (isValid) {
    const cached2 = authCache.get(userId)
    const shouldUpdate = !cached2?.lastSeenUpdatedAt || now - cached2.lastSeenUpdatedAt > 5 * 60 * 1000
    if (shouldUpdate) {
      entry.lastSeenUpdatedAt = now
      getPrisma().user.update({ where: { id: userId }, data: { lastSeenAt: new Date() } }).catch(() => {})
    }
  }
  return isValid
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorised' })
    return
  }
  try {
    const payload = verifyToken(header.slice(7))
    ;(req as Request & { user: JWTPayload }).user = payload

    // Async status + tokenVersion check (deactivation enforcement)
    checkUserValid(payload.userId, payload.tokenVersion).then(valid => {
      if (!valid) {
        res.status(401).json({ error: 'Account is deactivated or session is invalid' })
        return
      }
      next()
    }).catch(() => {
      // On DB error, fall through (fail open — prefer availability over strict enforcement)
      next()
    })
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' })
  }
}

export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = (req as Request & { user: JWTPayload }).user
    if (!user || !roles.some(r => user.roles.includes(r))) {
      res.status(403).json({ error: 'Forbidden' })
      return
    }
    next()
  }
}
