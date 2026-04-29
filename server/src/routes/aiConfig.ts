import { Router } from 'express'
import { getPrisma } from '../lib/prisma'
import { requireAuth } from '../lib/auth'

const router = Router()
router.use(requireAuth)

// GET /api/ai-config
router.get('/', async (_req, res) => {
  try {
    const record = await getPrisma().aIConfig.findUnique({ where: { id: 'default' } })
    res.json(record?.config ?? null)
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch AI config' })
  }
})

// PUT /api/ai-config
router.put('/', async (req, res) => {
  try {
    const config = req.body
    const record = await getPrisma().aIConfig.upsert({
      where: { id: 'default' },
      update: { config },
      create: { id: 'default', config },
    })
    res.json(record.config)
  } catch (err) {
    res.status(500).json({ error: 'Failed to save AI config' })
  }
})

export default router
