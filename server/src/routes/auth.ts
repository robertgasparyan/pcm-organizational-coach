import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { getPrisma } from '../lib/prisma'
import { signToken, requireAuth } from '../lib/auth'
import type { JWTPayload } from '../lib/auth'
import type { Request } from 'express'

const router = Router()

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body
    if (!email || !password) {
      res.status(400).json({ error: 'Email and password required' })
      return
    }
    const user = await getPrisma().user.findUnique({ where: { email } })
    if (!user) {
      res.status(401).json({ error: 'Invalid credentials' })
      return
    }
    const valid = await bcrypt.compare(password, user.password)
    if (!valid) {
      res.status(401).json({ error: 'Invalid credentials' })
      return
    }
    if (user.status === 'inactive') {
      res.status(403).json({ error: 'Account is deactivated. Contact your administrator.' })
      return
    }
    const token = signToken({ userId: user.id, email: user.email, roles: user.roles, orgId: user.orgId ?? null, tokenVersion: user.tokenVersion })
    res.json({ token, user: { id: user.id, email: user.email, name: user.name, roles: user.roles, orgId: user.orgId ?? null } })
  } catch (err) {
    console.error('Login error:', err instanceof Error ? err.message : err)
    res.status(500).json({ error: 'Login failed' })
  }
})

// GET /api/auth/me
router.get('/me', requireAuth, async (req, res) => {
  try {
    const { userId } = (req as Request & { user: JWTPayload }).user
    const user = await getPrisma().user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true, roles: true, orgId: true, status: true, createdAt: true },
    })
    if (!user) { res.status(404).json({ error: 'User not found' }); return }
    res.json(user)
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch user' })
  }
})

// PUT /api/auth/password  (change own password)
router.put('/password', requireAuth, async (req, res) => {
  try {
    const { userId } = (req as Request & { user: JWTPayload }).user
    const { currentPassword, newPassword } = req.body
    if (!currentPassword || !newPassword) {
      res.status(400).json({ error: 'Both current and new password required' })
      return
    }
    const user = await getPrisma().user.findUnique({ where: { id: userId } })
    if (!user) { res.status(404).json({ error: 'User not found' }); return }
    const valid = await bcrypt.compare(currentPassword, user.password)
    if (!valid) { res.status(401).json({ error: 'Current password is incorrect' }); return }
    const hashed = await bcrypt.hash(newPassword, 10)
    await getPrisma().user.update({ where: { id: userId }, data: { password: hashed } })
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: 'Failed to change password' })
  }
})

export default router
