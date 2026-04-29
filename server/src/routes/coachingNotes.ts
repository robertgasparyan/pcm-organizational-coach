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

function toClient(n: any) {
  return {
    id: n.id,
    profileId: n.profileId,
    authorId: n.authorId,
    content: n.content,
    isShared: n.isShared,
    createdAt: n.createdAt.toISOString(),
    updatedAt: n.updatedAt.toISOString(),
  }
}

// GET /api/coaching-notes/last-activity — returns { profileId, lastNoteAt }[] for all profiles
router.get('/last-activity', async (req, res) => {
  try {
    const { userId, orgId } = getUser(req)
    const profileFilter = orgId ? { profile: { orgId } } : {}
    const notes = await getPrisma().coachingNote.findMany({
      where: { ...profileFilter, OR: [{ authorId: userId }, { isShared: true }] },
      select: { profileId: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    })
    // Deduplicate: keep most-recent per profile
    const map = new Map<string, string>()
    for (const n of notes) {
      if (!map.has(n.profileId)) map.set(n.profileId, n.createdAt.toISOString())
    }
    res.json(Array.from(map.entries()).map(([profileId, lastNoteAt]) => ({ profileId, lastNoteAt })))
  } catch {
    res.status(500).json({ error: 'Failed to fetch last activity' })
  }
})

// GET /api/coaching-notes?profileId=xxx
// Returns own notes + shared notes from others, with authorName resolved
router.get('/', async (req, res) => {
  try {
    const { userId, orgId } = getUser(req)
    const { profileId } = req.query
    const profileFilter = orgId ? { profile: { orgId } } : {}
    const where: any = profileId ? { profileId: String(profileId) } : profileFilter
    const notes = await getPrisma().coachingNote.findMany({
      where: { ...where, OR: [{ authorId: userId }, { isShared: true }] },
      orderBy: { createdAt: 'desc' },
    })
    // Resolve author names in one batch query
    const authorIds = [...new Set(notes.map(n => n.authorId))]
    const authors = await getPrisma().user.findMany({
      where: { id: { in: authorIds } },
      select: { id: true, name: true },
    })
    const authorMap = Object.fromEntries(authors.map(u => [u.id, u.name]))
    res.json(notes.map(n => ({ ...toClient(n), authorName: authorMap[n.authorId] ?? 'Unknown' })))
  } catch {
    res.status(500).json({ error: 'Failed to fetch notes' })
  }
})

// POST /api/coaching-notes
router.post('/', async (req, res) => {
  try {
    const { userId, orgId } = getUser(req)
    const { profileId, content, isShared = false } = req.body
    if (!profileId || !content?.trim()) {
      res.status(400).json({ error: 'profileId and content required' })
      return
    }
    if (orgId) {
      const profile = await getPrisma().profile.findUnique({ where: { id: profileId }, select: { orgId: true } })
      if (!profile || profile.orgId !== orgId) {
        res.status(403).json({ error: 'Profile does not belong to your organization' }); return
      }
    }
    const note = await getPrisma().coachingNote.create({
      data: { profileId, authorId: userId, content, isShared },
    })
    res.status(201).json(toClient(note))
  } catch {
    res.status(500).json({ error: 'Failed to create note' })
  }
})

// PUT /api/coaching-notes/:id
router.put('/:id', async (req, res) => {
  try {
    const { userId } = getUser(req)
    const { content, isShared } = req.body
    const existing = await getPrisma().coachingNote.findUnique({ where: { id: req.params.id } })
    if (!existing) { res.status(404).json({ error: 'Note not found' }); return }
    if (existing.authorId !== userId) { res.status(403).json({ error: 'Not your note' }); return }
    const note = await getPrisma().coachingNote.update({
      where: { id: req.params.id },
      data: {
        ...(content !== undefined && { content }),
        ...(isShared !== undefined && { isShared }),
      },
    })
    res.json(toClient(note))
  } catch {
    res.status(500).json({ error: 'Failed to update note' })
  }
})

// DELETE /api/coaching-notes/:id
router.delete('/:id', async (req, res) => {
  try {
    const { userId } = getUser(req)
    const existing = await getPrisma().coachingNote.findUnique({ where: { id: req.params.id } })
    if (!existing) { res.status(404).json({ error: 'Note not found' }); return }
    if (existing.authorId !== userId) { res.status(403).json({ error: 'Not your note' }); return }
    await getPrisma().coachingNote.delete({ where: { id: req.params.id } })
    res.json({ ok: true })
  } catch {
    res.status(500).json({ error: 'Failed to delete note' })
  }
})

export default router
