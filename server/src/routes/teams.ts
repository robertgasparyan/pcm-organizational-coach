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

// GET /api/teams
router.get('/', async (req, res) => {
  try {
    const { orgId } = getUser(req)
    const where = orgId ? { orgId } : {}
    const teams = await getPrisma().team.findMany({
      where,
      include: { members: { select: { profileId: true } } },
      orderBy: { createdAt: 'asc' },
    })
    res.json(teams.map(toClientTeam))
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch teams' })
  }
})

// GET /api/teams/:id
router.get('/:id', async (req, res) => {
  try {
    const team = await getPrisma().team.findUnique({
      where: { id: req.params.id },
      include: { members: { select: { profileId: true } } },
    })
    if (!team) { res.status(404).json({ error: 'Team not found' }); return }
    res.json(toClientTeam(team))
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch team' })
  }
})

// POST /api/teams
router.post('/', async (req, res) => {
  try {
    const { orgId } = getUser(req)
    const { id, name, description, groupId, memberIds = [] } = req.body
    const team = await getPrisma().team.create({
      data: {
        id,
        name,
        description: description ?? null,
        groupId: groupId ?? null,
        orgId: orgId ?? null,
        members: memberIds.length
          ? { create: memberIds.map((pid: string) => ({ profileId: pid })) }
          : undefined,
      },
      include: { members: { select: { profileId: true } } },
    })
    res.status(201).json(toClientTeam(team))
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to create team' })
  }
})

// PUT /api/teams/:id
router.put('/:id', async (req, res) => {
  try {
    const { name, description, groupId, memberIds } = req.body
    const teamId = req.params.id

    if (memberIds !== undefined) {
      await getPrisma().teamMember.deleteMany({ where: { teamId } })
      if (memberIds.length > 0) {
        await getPrisma().teamMember.createMany({
          data: memberIds.map((pid: string) => ({ teamId, profileId: pid })),
        })
      }
    }

    const team = await getPrisma().team.update({
      where: { id: teamId },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description: description ?? null }),
        ...(groupId !== undefined && { groupId: groupId ?? null }),
      },
      include: { members: { select: { profileId: true } } },
    })
    res.json(toClientTeam(team))
  } catch (err) {
    res.status(500).json({ error: 'Failed to update team' })
  }
})

// DELETE /api/teams/:id
router.delete('/:id', async (req, res) => {
  try {
    await getPrisma().team.delete({ where: { id: req.params.id } })
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete team' })
  }
})

function toClientTeam(t: any) {
  return {
    id: t.id,
    name: t.name,
    description: t.description ?? undefined,
    groupId: t.groupId ?? undefined,
    memberIds: t.members.map((m: any) => m.profileId),
    createdAt: t.createdAt.toISOString(),
  }
}

export default router
