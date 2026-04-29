import { Router } from 'express'
import { getPrisma } from '../lib/prisma'
import { requireAuth, requireRole } from '../lib/auth'
import type { JWTPayload } from '../lib/auth'
import type { Request } from 'express'

const router = Router()
router.use(requireAuth, requireRole('admin'))

// GET /api/audit-log?limit=50&offset=0
router.get('/', async (req, res) => {
  try {
    const caller = (req as Request & { user: JWTPayload }).user
    const limit = Math.min(Number(req.query.limit) || 50, 200)
    const offset = Number(req.query.offset) || 0
    const where = caller.orgId ? { orgId: caller.orgId } : {}

    const [entries, total] = await Promise.all([
      getPrisma().auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit,
        select: { id: true, userId: true, userName: true, action: true, entity: true, entityId: true, entityName: true, createdAt: true },
      }),
      getPrisma().auditLog.count({ where }),
    ])

    res.json({
      entries: entries.map(e => ({ ...e, createdAt: e.createdAt.toISOString() })),
      total,
      limit,
      offset,
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to fetch audit log' })
  }
})

export default router
