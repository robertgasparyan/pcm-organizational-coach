import { Router } from 'express'
import { getPrisma } from '../lib/prisma'
import { requireAuth } from '../lib/auth'
import type { JWTPayload } from '../lib/auth'
import type { Request } from 'express'

function getUser(req: Request): JWTPayload {
  return (req as Request & { user: JWTPayload }).user
}

const router = Router()
router.use(requireAuth)

// GET /api/groups
router.get('/', async (req, res) => {
  try {
    const { orgId } = getUser(req)
    const where = orgId ? { orgId } : {}
    const groups = await getPrisma().group.findMany({
      where,
      include: { teams: { select: { id: true } } },
      orderBy: { createdAt: 'asc' },
    })
    res.json(groups.map(toClientGroup))
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch groups' })
  }
})

// GET /api/groups/:id
router.get('/:id', async (req, res) => {
  try {
    const group = await getPrisma().group.findUnique({
      where: { id: req.params.id },
      include: { teams: { select: { id: true } } },
    })
    if (!group) { res.status(404).json({ error: 'Group not found' }); return }
    res.json(toClientGroup(group))
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch group' })
  }
})

// POST /api/groups
router.post('/', async (req, res) => {
  try {
    const { orgId } = getUser(req)
    const { id, name, description, teamIds = [] } = req.body
    const group = await getPrisma().group.create({
      data: {
        id,
        name,
        description: description ?? null,
        orgId: orgId ?? null,
        teams: teamIds.length ? { connect: teamIds.map((tid: string) => ({ id: tid })) } : undefined,
      },
      include: { teams: { select: { id: true } } },
    })
    res.status(201).json(toClientGroup(group))
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to create group' })
  }
})

// PUT /api/groups/:id
router.put('/:id', async (req, res) => {
  try {
    const { name, description, teamIds } = req.body
    const group = await getPrisma().group.update({
      where: { id: req.params.id },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description: description ?? null }),
        ...(teamIds !== undefined && {
          teams: { set: teamIds.map((tid: string) => ({ id: tid })) },
        }),
      },
      include: { teams: { select: { id: true } } },
    })
    res.json(toClientGroup(group))
  } catch (err) {
    res.status(500).json({ error: 'Failed to update group' })
  }
})

// DELETE /api/groups/:id
router.delete('/:id', async (req, res) => {
  try {
    await getPrisma().team.updateMany({
      where: { groupId: req.params.id },
      data: { groupId: null },
    })
    await getPrisma().group.delete({ where: { id: req.params.id } })
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete group' })
  }
})

function toClientGroup(g: any) {
  return {
    id: g.id,
    name: g.name,
    description: g.description ?? undefined,
    teamIds: g.teams.map((t: any) => t.id),
    createdAt: g.createdAt.toISOString(),
  }
}

export default router
