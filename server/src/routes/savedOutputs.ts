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

function toClient(s: any, includeProfile = false) {
  return {
    id: s.id,
    profileId: s.profileId,
    ...(includeProfile ? { profileName: s.profile?.name ?? null } : {}),
    authorId: s.authorId,
    type: s.type,
    title: s.title,
    content: s.content,
    createdAt: s.createdAt.toISOString(),
  }
}

// GET /api/saved-outputs/count — total saved outputs for the current user's profiles
router.get('/count', async (req, res) => {
  try {
    const { userId, orgId } = getUser(req)
    const profileFilter = orgId ? { profile: { orgId } } : {}
    const count = await getPrisma().savedOutput.count({ where: { ...profileFilter, authorId: userId } })
    res.json({ count })
  } catch {
    res.status(500).json({ error: 'Failed' })
  }
})

// GET /api/saved-outputs?profileId=xxx
router.get('/', async (req, res) => {
  try {
    const { orgId } = getUser(req)
    const { profileId } = req.query
    const profileFilter = orgId ? { profile: { orgId } } : {}
    const where: any = profileId ? { profileId: String(profileId) } : profileFilter
    const outputs = await getPrisma().savedOutput.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { profile: { select: { name: true } } },
    })
    res.json(outputs.map(s => toClient(s, true)))
  } catch {
    res.status(500).json({ error: 'Failed to fetch saved outputs' })
  }
})

// POST /api/saved-outputs
router.post('/', async (req, res) => {
  try {
    const { userId, orgId } = getUser(req)
    const { profileId, type, title, content } = req.body
    if (!profileId || !type || !title || !content) {
      res.status(400).json({ error: 'profileId, type, title, and content required' })
      return
    }
    if (orgId) {
      const profile = await getPrisma().profile.findUnique({ where: { id: profileId }, select: { orgId: true } })
      if (!profile || profile.orgId !== orgId) {
        res.status(403).json({ error: 'Profile does not belong to your organization' }); return
      }
    }
    const output = await getPrisma().savedOutput.create({
      data: { profileId, authorId: userId, type, title, content },
    })
    res.status(201).json(toClient(output))
  } catch {
    res.status(500).json({ error: 'Failed to save output' })
  }
})

// DELETE /api/saved-outputs/:id
router.delete('/:id', async (req, res) => {
  try {
    const { userId } = getUser(req)
    const existing = await getPrisma().savedOutput.findUnique({ where: { id: req.params.id } })
    if (!existing) { res.status(404).json({ error: 'Not found' }); return }
    if (existing.authorId !== userId) { res.status(403).json({ error: 'Not your output' }); return }
    await getPrisma().savedOutput.delete({ where: { id: req.params.id } })
    res.json({ ok: true })
  } catch {
    res.status(500).json({ error: 'Failed to delete saved output' })
  }
})

export default router
