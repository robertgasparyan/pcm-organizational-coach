import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { getPrisma } from '../lib/prisma'
import { requireAuth, requireRole, invalidateAuthCache } from '../lib/auth'
import type { JWTPayload } from '../lib/auth'
import { logAudit } from '../lib/audit'
import type { Request } from 'express'

const router = Router()
router.use(requireAuth, requireRole('admin'))

const VALID_ROLES = ['admin', 'hr', 'coach']

function toClientUser(u: any) {
  return { id: u.id, email: u.email, name: u.name, roles: u.roles, status: u.status, orgId: u.orgId, createdAt: u.createdAt.toISOString(), lastSeenAt: u.lastSeenAt ? u.lastSeenAt.toISOString() : null }
}

// GET /api/users
router.get('/', async (req, res) => {
  try {
    const caller = (req as Request & { user: JWTPayload }).user
    const where = caller.orgId ? { orgId: caller.orgId } : {}
    const users = await getPrisma().user.findMany({
      where,
      select: { id: true, email: true, name: true, roles: true, status: true, orgId: true, createdAt: true, lastSeenAt: true },
      orderBy: { createdAt: 'asc' },
    })
    res.json(users.map(toClientUser))
  } catch {
    res.status(500).json({ error: 'Failed to fetch users' })
  }
})

// POST /api/users
router.post('/', async (req, res) => {
  try {
    const { email, name, password, roles = [] } = req.body
    if (!email || !name || !password) {
      res.status(400).json({ error: 'email, name and password are required' })
      return
    }
    const validRoles = roles.filter((r: string) => VALID_ROLES.includes(r))
    if (validRoles.length === 0) {
      res.status(400).json({ error: 'At least one valid role required (admin, hr, coach)' })
      return
    }
    const existing = await getPrisma().user.findUnique({ where: { email } })
    if (existing) { res.status(409).json({ error: 'Email already in use' }); return }
    const caller = (req as Request & { user: JWTPayload }).user
    const hashed = await bcrypt.hash(password, 10)
    const user = await getPrisma().user.create({
      data: { email, name, password: hashed, roles: validRoles, orgId: caller.orgId ?? null },
    })
    logAudit(caller, 'created', 'user', user.id, user.name)
    res.status(201).json(toClientUser(user))
  } catch {
    res.status(500).json({ error: 'Failed to create user' })
  }
})

// PUT /api/users/:id
router.put('/:id', async (req, res) => {
  try {
    const caller = (req as unknown as Request & { user: JWTPayload }).user
    const callerId = caller.userId
    const { name, email, roles, password, status } = req.body
    const targetId = req.params.id

    // Prevent removing admin role from yourself
    if (targetId === callerId && roles && !roles.includes('admin')) {
      res.status(400).json({ error: 'Cannot remove admin role from your own account' })
      return
    }

    const data: any = {}
    if (name !== undefined) data.name = name
    if (email !== undefined) data.email = email
    if (roles !== undefined) {
      const validRoles = roles.filter((r: string) => VALID_ROLES.includes(r))
      if (validRoles.length === 0) {
        res.status(400).json({ error: 'At least one valid role required' })
        return
      }
      data.roles = validRoles
    }
    if (password) data.password = await bcrypt.hash(password, 10)
    if (status !== undefined && ['active', 'inactive'].includes(status)) {
      data.status = status
      // Invalidate existing tokens by bumping tokenVersion when deactivating
      if (status === 'inactive') {
        data.tokenVersion = { increment: 1 }
        invalidateAuthCache(targetId)
      }
    }

    const user = await getPrisma().user.update({ where: { id: targetId }, data })

    if (status === 'inactive') {
      logAudit(caller, 'deactivated', 'user', targetId)
    } else if (status === 'active') {
      logAudit(caller, 'activated', 'user', targetId)
    }
    if (roles !== undefined) {
      logAudit(caller, 'role_changed', 'user', targetId)
    }

    res.json(toClientUser(user))
  } catch {
    res.status(500).json({ error: 'Failed to update user' })
  }
})

// DELETE /api/users/:id
router.delete('/:id', async (req, res) => {
  try {
    const caller = (req as unknown as Request & { user: JWTPayload }).user
    const id = req.params.id
    if (id === caller.userId) {
      res.status(400).json({ error: 'Cannot delete your own account' })
      return
    }
    const existing = await getPrisma().user.findUnique({ where: { id }, select: { name: true } })
    await getPrisma().user.delete({ where: { id } })
    logAudit(caller, 'deleted', 'user', id, existing?.name ?? undefined)
    res.json({ ok: true })
  } catch {
    res.status(500).json({ error: 'Failed to delete user' })
  }
})

export default router
