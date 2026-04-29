import { Router } from 'express'
import { getPrisma } from '../lib/prisma'
import { requireAuth, requireRole } from '../lib/auth'
import type { JWTPayload } from '../lib/auth'
import type { Request } from 'express'

const router = Router()
router.use(requireAuth)

function getUser(req: Request): JWTPayload {
  return (req as Request & { user: JWTPayload }).user
}

// GET /api/organizations/current — current user's org
router.get('/current', async (req, res) => {
  try {
    const { orgId } = getUser(req)
    if (!orgId) { res.status(404).json({ error: 'No organization' }); return }
    const org = await getPrisma().organization.findUnique({
      where: { id: orgId },
      include: { _count: { select: { users: true, profiles: true } } },
    })
    if (!org) { res.status(404).json({ error: 'Organization not found' }); return }
    res.json({
      id: org.id,
      name: org.name,
      slug: org.slug,
      plan: org.plan,
      appTitle: org.appTitle ?? null,
      createdAt: org.createdAt.toISOString(),
      userCount: org._count.users,
      profileCount: org._count.profiles,
    })
  } catch {
    res.status(500).json({ error: 'Failed to fetch organization' })
  }
})

// PUT /api/organizations/current — update org settings (admin only)
router.put('/current', requireRole('admin'), async (req, res) => {
  try {
    const { orgId } = getUser(req)
    if (!orgId) { res.status(404).json({ error: 'No organization' }); return }
    const { name, appTitle } = req.body
    if (!name?.trim()) { res.status(400).json({ error: 'name is required' }); return }
    const data: any = { name: name.trim() }
    if (appTitle !== undefined) data.appTitle = appTitle?.trim() || null
    const org = await getPrisma().organization.update({ where: { id: orgId }, data })
    res.json({ id: org.id, name: org.name, slug: org.slug, plan: org.plan, appTitle: org.appTitle ?? null })
  } catch {
    res.status(500).json({ error: 'Failed to update organization' })
  }
})

export default router
