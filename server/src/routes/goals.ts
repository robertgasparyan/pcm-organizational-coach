import { Router } from 'express'
import { getPrisma } from '../lib/prisma'
import { requireAuth, requireRole } from '../lib/auth'
import type { JWTPayload } from '../lib/auth'
import type { Request } from 'express'

const router = Router()
router.use(requireAuth, requireRole('coach', 'admin'))

function getUser(req: Request): JWTPayload {
  return (req as Request & { user: JWTPayload }).user
}

function toClient(g: any) {
  return {
    id: g.id,
    profileId: g.profileId,
    authorId: g.authorId,
    title: g.title,
    description: g.description ?? null,
    status: g.status,
    dueDate: g.dueDate ? g.dueDate.toISOString() : null,
    completedAt: g.completedAt ? g.completedAt.toISOString() : null,
    createdAt: g.createdAt.toISOString(),
    updatedAt: g.updatedAt.toISOString(),
  }
}

// GET /api/goals/overdue-count — active goals past their due date
router.get('/overdue-count', async (req, res) => {
  try {
    const { orgId } = getUser(req)
    const profileFilter = orgId ? { profile: { orgId } } : {}
    const count = await getPrisma().goal.count({
      where: { ...profileFilter, status: 'active', dueDate: { lt: new Date() } },
    })
    res.json({ count })
  } catch {
    res.status(500).json({ error: 'Failed' })
  }
})

// GET /api/goals/stats — aggregate counts across all profiles
router.get('/stats', async (req, res) => {
  try {
    const { orgId } = getUser(req)
    const profileFilter = orgId ? { profile: { orgId } } : {}
    const [active, completed, overdue] = await Promise.all([
      getPrisma().goal.count({ where: { ...profileFilter, status: 'active' } }),
      getPrisma().goal.count({ where: { ...profileFilter, status: 'completed' } }),
      getPrisma().goal.count({ where: { ...profileFilter, status: 'active', dueDate: { lt: new Date() } } }),
    ])
    res.json({ active, completed, overdue })
  } catch {
    res.status(500).json({ error: 'Failed' })
  }
})

// GET /api/goals?profileId=xxx&overdue=true
router.get('/', async (req, res) => {
  try {
    const { orgId } = getUser(req)
    const { profileId, overdue } = req.query
    const profileFilter = orgId ? { profile: { orgId } } : {}
    const where: any = profileId
      ? { profileId: String(profileId) }
      : profileFilter
    if (overdue === 'true') {
      where.status = 'active'
      where.dueDate = { lt: new Date() }
    }
    const goals = await getPrisma().goal.findMany({
      where,
      orderBy: { dueDate: 'asc' },
      include: { profile: { select: { name: true } } },
    })
    res.json(goals.map(g => ({ ...toClient(g), profileName: (g as any).profile?.name ?? null })))
  } catch {
    res.status(500).json({ error: 'Failed to fetch goals' })
  }
})

// POST /api/goals
router.post('/', async (req, res) => {
  try {
    const { userId, orgId } = getUser(req)
    const { profileId, title, description, dueDate } = req.body
    if (!profileId || !title?.trim()) {
      res.status(400).json({ error: 'profileId and title required' })
      return
    }
    if (orgId) {
      const profile = await getPrisma().profile.findUnique({ where: { id: profileId }, select: { orgId: true } })
      if (!profile || profile.orgId !== orgId) {
        res.status(403).json({ error: 'Profile does not belong to your organization' }); return
      }
    }
    const goal = await getPrisma().goal.create({
      data: {
        profileId,
        authorId: userId,
        title: title.trim(),
        description: description?.trim() || null,
        dueDate: dueDate ? new Date(dueDate) : null,
        status: 'active',
      },
    })
    res.status(201).json(toClient(goal))
  } catch {
    res.status(500).json({ error: 'Failed to create goal' })
  }
})

// PUT /api/goals/:id
router.put('/:id', async (req, res) => {
  try {
    const { title, description, status, dueDate } = req.body
    const existing = await getPrisma().goal.findUnique({ where: { id: req.params.id } })
    if (!existing) { res.status(404).json({ error: 'Goal not found' }); return }
    const goal = await getPrisma().goal.update({
      where: { id: req.params.id },
      data: {
        ...(title !== undefined && { title: title.trim() }),
        ...(description !== undefined && { description: description?.trim() || null }),
        ...(status !== undefined && { status }),
        ...(dueDate !== undefined && { dueDate: dueDate ? new Date(dueDate) : null }),
        ...(status === 'completed' && { completedAt: new Date() }),
        ...(status === 'active' && { completedAt: null }),
      },
    })
    res.json(toClient(goal))
  } catch {
    res.status(500).json({ error: 'Failed to update goal' })
  }
})

// DELETE /api/goals/:id
router.delete('/:id', async (req, res) => {
  try {
    const existing = await getPrisma().goal.findUnique({ where: { id: req.params.id } })
    if (!existing) { res.status(404).json({ error: 'Goal not found' }); return }
    await getPrisma().goal.delete({ where: { id: req.params.id } })
    res.json({ ok: true })
  } catch {
    res.status(500).json({ error: 'Failed to delete goal' })
  }
})

export default router
