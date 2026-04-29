import { Router } from 'express'
import { getPrisma } from '../lib/prisma'
import { requireAuth, requireRole } from '../lib/auth'
import type { JWTPayload } from '../lib/auth'
import { logAudit } from '../lib/audit'
import type { Request } from 'express'

function getUser(req: Request): JWTPayload {
  return (req as Request & { user: JWTPayload }).user
}

const router = Router()
router.use(requireAuth)

// GET /api/profiles
router.get('/', async (req, res) => {
  try {
    const { orgId } = getUser(req)
    const where = orgId ? { orgId } : {}
    const profiles = await getPrisma().profile.findMany({
      where,
      include: { teamMembers: { select: { teamId: true } } },
      orderBy: { createdAt: 'desc' },
    })
    res.json(profiles.map(toClientProfile))
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to fetch profiles' })
  }
})

// GET /api/profiles/:id
router.get('/:id', async (req, res) => {
  try {
    const profile = await getPrisma().profile.findUnique({
      where: { id: req.params.id },
      include: { teamMembers: { select: { teamId: true } } },
    })
    if (!profile) { res.status(404).json({ error: 'Profile not found' }); return }
    res.json(toClientProfile(profile))
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch profile' })
  }
})

// POST /api/profiles — requires profiles_write or admin
router.post('/', requireRole('profiles_write', 'admin'), async (req, res) => {
  try {
    const data = req.body
    const { orgId } = getUser(req)
    const user = getUser(req)
    const profile = await getPrisma().profile.create({
      data: {
        id: data.id,
        name: data.name,
        role: data.role ?? null,
        department: data.department ?? null,
        assessmentDate: data.assessmentDate ? new Date(data.assessmentDate) : null,
        base: data.base,
        phase: data.phase,
        rawPdfName: data.rawPdfName ?? null,
        orgId: orgId ?? null,
        coachId: data.coachId ?? null,
        floors: data.floors,
        phaseStress: data.phaseStress,
        baseStress: data.baseStress,
        perceptionFilters: data.perceptionFilters,
        interactionStyles: data.interactionStyles,
        personalityParts: data.personalityParts,
        communicationChannels: data.communicationChannels,
        preferredEnvironment: data.preferredEnvironment,
        psychologicalNeeds: data.psychologicalNeeds,
      },
      include: { teamMembers: { select: { teamId: true } } },
    })
    logAudit(user, 'created', 'profile', profile.id, data.name)
    res.status(201).json(toClientProfile(profile))
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to create profile' })
  }
})

// PUT /api/profiles/:id — requires profiles_write or admin
router.put('/:id', requireRole('profiles_write', 'admin'), async (req, res) => {
  try {
    const data = req.body
    const id = req.params.id
    const user = getUser(req)
    const profile = await getPrisma().profile.update({
      where: { id },
      data: {
        name: data.name,
        role: data.role ?? null,
        department: data.department ?? null,
        assessmentDate: data.assessmentDate ? new Date(data.assessmentDate) : null,
        base: data.base,
        phase: data.phase,
        rawPdfName: data.rawPdfName ?? null,
        coachId: data.coachId ?? null,
        floors: data.floors,
        phaseStress: data.phaseStress,
        baseStress: data.baseStress,
        perceptionFilters: data.perceptionFilters,
        interactionStyles: data.interactionStyles,
        personalityParts: data.personalityParts,
        communicationChannels: data.communicationChannels,
        preferredEnvironment: data.preferredEnvironment,
        psychologicalNeeds: data.psychologicalNeeds,
      },
      include: { teamMembers: { select: { teamId: true } } },
    })
    logAudit(user, 'updated', 'profile', id, data.name)
    res.json(toClientProfile(profile))
  } catch (err) {
    res.status(500).json({ error: 'Failed to update profile' })
  }
})

// DELETE /api/profiles/:id — requires profiles_write or admin
router.delete('/:id', requireRole('profiles_write', 'admin'), async (req, res) => {
  try {
    const id = req.params.id
    const user = getUser(req)
    const existing = await getPrisma().profile.findUnique({ where: { id }, select: { name: true } })
    await getPrisma().profile.delete({ where: { id } })
    logAudit(user, 'deleted', 'profile', id, existing?.name ?? undefined)
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete profile' })
  }
})

// ─── Helper ──────────────────────────────────────────────────────────────────
function toClientProfile(p: any) {
  return {
    id: p.id,
    name: p.name,
    role: p.role ?? undefined,
    department: p.department ?? undefined,
    assessmentDate: p.assessmentDate ? p.assessmentDate.toISOString().split('T')[0] : undefined,
    base: p.base,
    phase: p.phase,
    rawPdfName: p.rawPdfName ?? undefined,
    coachId: p.coachId ?? null,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
    floors: p.floors,
    phaseStress: p.phaseStress,
    baseStress: p.baseStress,
    perceptionFilters: p.perceptionFilters,
    interactionStyles: p.interactionStyles,
    personalityParts: p.personalityParts,
    communicationChannels: p.communicationChannels,
    preferredEnvironment: p.preferredEnvironment,
    psychologicalNeeds: p.psychologicalNeeds,
  }
}

export default router
