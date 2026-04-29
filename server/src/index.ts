import path from 'path'
import { config } from 'dotenv'
config({ path: path.resolve(__dirname, '../.env') })

import express from 'express'
import cors from 'cors'
import multer from 'multer'
import { parsePDF } from './services/pdfParser'
import {
  generateRecommendations,
  generateTeamRecommendations,
  generateTeamAnalysis,
  generateHiringRecommendation,
  generateDevelopmentPlan,
  enhanceDevelopmentPlan,
  generateTeamComposition,
  generateTeamSuggestion,
  generateMeetingPrep,
  generateSessionPrep,
  generateConflictResolution,
  generateMeetingFacilitation,
  generateCoachingJourney,
  generateSimulatorReply,
  generateSimulatorDebrief,
  generateCoachHints,
  generateTurnHints,
  generatePCMChatReply,
  testConnection,
} from './services/aiRecommendations'
import type { AIConfig, SimMessage } from './services/aiRecommendations'
import { requireAuth, requireRole } from './lib/auth'
import { getPrisma } from './lib/prisma'

import authRouter     from './routes/auth'
import profilesRouter from './routes/profiles'
import teamsRouter    from './routes/teams'
import groupsRouter   from './routes/groups'
import aiConfigRouter from './routes/aiConfig'
import usersRouter         from './routes/users'
import coachingNotesRouter from './routes/coachingNotes'
import savedOutputsRouter  from './routes/savedOutputs'
import goalsRouter         from './routes/goals'
import organizationsRouter from './routes/organizations'
import auditLogRouter      from './routes/auditLog'

const app = express()
const upload = multer({ storage: multer.memoryStorage() })

app.use(cors())
app.use(express.json())

// ─── Auth ────────────────────────────────────────────────────────────────────
app.use('/api/auth', authRouter)

// ─── CRUD resources ──────────────────────────────────────────────────────────
app.use('/api/profiles', profilesRouter)
app.use('/api/teams',    teamsRouter)
app.use('/api/groups',   groupsRouter)
app.use('/api/ai-config', aiConfigRouter)
app.use('/api/users',          usersRouter)
app.use('/api/coaching-notes', coachingNotesRouter)
app.use('/api/saved-outputs',  savedOutputsRouter)
app.use('/api/goals',          goalsRouter)
app.use('/api/organizations',  organizationsRouter)
app.use('/api/audit-log',      auditLogRouter)

// ─── Data export ─────────────────────────────────────────────────────────────
app.get('/api/export/profiles', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const orgId = (req as any).user.orgId
    const profiles = await getPrisma().profile.findMany({ where: orgId ? { orgId } : {} })
    res.json(profiles)
  } catch (err) {
    console.error('Export profiles error:', err)
    res.status(500).json({ error: 'Failed to export profiles' })
  }
})

// ─── AI endpoints (protected) ────────────────────────────────────────────────
app.get('/api/parse-pdf/status', requireAuth, (_req, res) => {
  const key = process.env.ANTHROPIC_API_KEY
  res.json({ available: !!key && key !== 'your_api_key_here' })
})

app.post('/api/parse-pdf', requireAuth, upload.single('pdf'), async (req, res) => {
  try {
    if (!req.file) { res.status(400).json({ error: 'No file uploaded' }); return }
    const profile = await parsePDF(req.file.buffer, req.file.originalname)
    res.json(profile)
  } catch (err) {
    console.error('PDF parse error:', err)
    const msg = err instanceof Error ? err.message : 'Failed to parse PDF'
    res.status(500).json({ error: msg })
  }
})

app.post('/api/recommend', requireAuth, async (req, res) => {
  try {
    const { profile, lang, aiConfig } = req.body
    if (!profile) { res.status(400).json({ error: 'No profile provided' }); return }
    const recommendations = await generateRecommendations(profile, lang ?? 'en', aiConfig as AIConfig | undefined)
    res.json(recommendations)
  } catch (err) {
    console.error('AI recommendation error:', err)
    res.status(500).json({ error: 'Failed to generate recommendations' })
  }
})

app.post('/api/team-coaching', requireAuth, async (req, res) => {
  try {
    const { profiles, teamName, lang, aiConfig } = req.body
    if (!profiles || !Array.isArray(profiles)) { res.status(400).json({ error: 'No profiles provided' }); return }
    const result = await generateTeamRecommendations(profiles, teamName ?? 'Team', lang ?? 'en', aiConfig as AIConfig | undefined)
    res.json(result)
  } catch (err) {
    console.error('Team coaching error:', err)
    res.status(500).json({ error: 'Failed to generate team recommendations' })
  }
})

app.post('/api/team-analysis', requireAuth, async (req, res) => {
  try {
    const { profiles, teamName, lang, aiConfig } = req.body
    if (!profiles || !Array.isArray(profiles)) { res.status(400).json({ error: 'No profiles provided' }); return }
    const result = await generateTeamAnalysis(profiles, teamName ?? 'Team', lang ?? 'en', aiConfig as AIConfig | undefined)
    res.json(result)
  } catch (err) {
    console.error('Team analysis error:', err)
    res.status(500).json({ error: 'Failed to generate team analysis' })
  }
})

app.post('/api/recommend-team', requireAuth, async (req, res) => {
  try {
    const { profiles, teamName, position, lang, aiConfig } = req.body
    if (!profiles || !Array.isArray(profiles)) { res.status(400).json({ error: 'No profiles provided' }); return }
    const result = await generateHiringRecommendation(profiles, teamName ?? 'Team', position, lang ?? 'en', aiConfig as AIConfig | undefined)
    res.json(result)
  } catch (err) {
    console.error('Hiring recommendation error:', err)
    res.status(500).json({ error: 'Failed to generate hiring recommendation' })
  }
})

app.post('/api/development-plan', requireAuth, async (req, res) => {
  try {
    const { profile, lang, aiConfig, notes } = req.body
    if (!profile) { res.status(400).json({ error: 'No profile provided' }); return }
    const result = await generateDevelopmentPlan(profile, lang ?? 'en', aiConfig as AIConfig | undefined, Array.isArray(notes) ? notes : undefined)
    res.json(result)
  } catch (err) {
    console.error('Development plan error:', err)
    res.status(500).json({ error: 'Failed to generate development plan' })
  }
})

app.post('/api/development-plan/enhance', requireAuth, async (req, res) => {
  try {
    const { profile, existingPlan, lang, aiConfig } = req.body
    if (!profile || !existingPlan) { res.status(400).json({ error: 'profile and existingPlan required' }); return }
    const result = await enhanceDevelopmentPlan(profile, existingPlan, lang ?? 'en', aiConfig as AIConfig | undefined)
    res.json(result)
  } catch (err) {
    console.error('Enhance development plan error:', err)
    res.status(500).json({ error: 'Failed to enhance development plan' })
  }
})

app.post('/api/team-composer/evaluate', requireAuth, async (req, res) => {
  try {
    const { profiles, purpose, lang, aiConfig } = req.body
    if (!profiles || !Array.isArray(profiles) || profiles.length < 2) { res.status(400).json({ error: 'At least 2 profiles required' }); return }
    const result = await generateTeamComposition(profiles, purpose, lang ?? 'en', aiConfig as AIConfig | undefined)
    res.json(result)
  } catch (err) {
    console.error('Team composition error:', err)
    res.status(500).json({ error: 'Failed to evaluate team composition' })
  }
})

app.post('/api/team-composer/suggest', requireAuth, async (req, res) => {
  try {
    const { profiles, teamSize, purpose, lang, aiConfig } = req.body
    if (!profiles || !Array.isArray(profiles)) { res.status(400).json({ error: 'No profiles provided' }); return }
    if (!purpose) { res.status(400).json({ error: 'Purpose is required' }); return }
    const result = await generateTeamSuggestion(profiles, teamSize ?? 5, purpose, lang ?? 'en', aiConfig as AIConfig | undefined)
    res.json(result)
  } catch (err) {
    console.error('Team suggestion error:', err)
    res.status(500).json({ error: 'Failed to suggest team composition' })
  }
})

app.post('/api/meeting-prep', requireAuth, async (req, res) => {
  try {
    const { manager, report, lang, aiConfig } = req.body
    if (!manager || !report) { res.status(400).json({ error: 'Both manager and report profiles required' }); return }
    const result = await generateMeetingPrep(manager, report, lang ?? 'en', aiConfig)
    res.json(result)
  } catch (err) {
    console.error('Meeting prep error:', err)
    res.status(500).json({ error: 'Failed to generate meeting prep' })
  }
})

app.post('/api/session-prep', requireAuth, async (req, res) => {
  try {
    const { profile, lang, aiConfig, notes } = req.body
    if (!profile) { res.status(400).json({ error: 'No profile provided' }); return }
    const result = await generateSessionPrep(profile, lang ?? 'en', aiConfig, Array.isArray(notes) ? notes : undefined)
    res.json(result)
  } catch (err) {
    console.error('Session prep error:', err)
    res.status(500).json({ error: 'Failed to generate session prep' })
  }
})

app.post('/api/conflict-resolution', requireAuth, async (req, res) => {
  try {
    const { profileA, profileB, lang, aiConfig } = req.body
    if (!profileA || !profileB) { res.status(400).json({ error: 'Two profiles required' }); return }
    const result = await generateConflictResolution(profileA, profileB, lang ?? 'en', aiConfig)
    res.json(result)
  } catch (err) {
    console.error('Conflict resolution error:', err)
    res.status(500).json({ error: 'Failed to generate conflict resolution' })
  }
})

app.post('/api/meeting-facilitation', requireAuth, async (req, res) => {
  try {
    const { profiles, teamName, lang, aiConfig } = req.body
    if (!profiles || !Array.isArray(profiles)) { res.status(400).json({ error: 'No profiles provided' }); return }
    const result = await generateMeetingFacilitation(profiles, teamName ?? 'Team', lang ?? 'en', aiConfig)
    res.json(result)
  } catch (err) {
    console.error('Meeting facilitation error:', err)
    res.status(500).json({ error: 'Failed to generate meeting facilitation' })
  }
})

app.post('/api/coaching-journey', requireAuth, async (req, res) => {
  try {
    const { profile, lang, aiConfig } = req.body
    if (!profile) { res.status(400).json({ error: 'No profile provided' }); return }
    const result = await generateCoachingJourney(profile, lang ?? 'en', aiConfig as AIConfig | undefined)
    res.json(result)
  } catch (err) {
    console.error('Coaching journey error:', err)
    res.status(500).json({ error: 'Failed to generate coaching journey' })
  }
})

app.post('/api/simulate', requireAuth, async (req, res) => {
  try {
    const { profile, scenario, userRole, messages, aiConfig } = req.body
    if (!profile || !scenario || !userRole || !messages) {
      res.status(400).json({ error: 'Missing required fields' }); return
    }
    const reply = await generateSimulatorReply(
      profile, scenario, userRole, messages as SimMessage[], aiConfig as AIConfig | undefined
    )
    res.json({ reply })
  } catch (err) {
    console.error('Simulator error:', err)
    res.status(500).json({ error: 'Failed to generate reply' })
  }
})

app.post('/api/simulate/coach-hints', requireAuth, async (req, res) => {
  try {
    const { profile, scenario, aiConfig } = req.body
    if (!profile || !scenario) {
      res.status(400).json({ error: 'Missing required fields' }); return
    }
    const hints = await generateCoachHints(profile, scenario, aiConfig)
    res.json(hints)
  } catch (err) {
    console.error('Coach hints error:', err)
    res.status(500).json({ error: 'Failed to generate hints' })
  }
})

app.post('/api/simulate/turn-hints', requireAuth, async (req, res) => {
  try {
    const { profile, scenario, messages, aiConfig } = req.body
    if (!profile || !scenario || !messages) {
      res.status(400).json({ error: 'Missing required fields' }); return
    }
    const hints = await generateTurnHints(profile, scenario, messages as SimMessage[], aiConfig)
    res.json(hints)
  } catch (err) {
    console.error('Turn hints error:', err)
    res.status(500).json({ error: 'Failed to generate turn hints' })
  }
})

app.post('/api/simulate/debrief', requireAuth, async (req, res) => {
  try {
    const { profile, scenario, userRole, messages, aiConfig } = req.body
    if (!profile || !scenario || !userRole || !messages) {
      res.status(400).json({ error: 'Missing required fields' }); return
    }
    const result = await generateSimulatorDebrief(
      profile, scenario, userRole, messages as SimMessage[], aiConfig as AIConfig | undefined
    )
    res.json(result)
  } catch (err) {
    console.error('Simulator debrief error:', err)
    res.status(500).json({ error: 'Failed to generate debrief' })
  }
})

app.post('/api/pcm-chat', requireAuth, async (req, res) => {
  try {
    const { messages, currentType, aiConfig } = req.body
    if (!messages || !Array.isArray(messages)) {
      res.status(400).json({ error: 'messages array required' }); return
    }
    const reply = await generatePCMChatReply(
      messages as SimMessage[],
      currentType ?? null,
      aiConfig as AIConfig | undefined
    )
    res.json({ reply })
  } catch (err) {
    console.error('PCM chat error:', err)
    res.status(500).json({ error: 'Failed to generate reply' })
  }
})

app.post('/api/test-connection', requireAuth, async (req, res) => {
  try {
    const { aiConfig } = req.body
    if (!aiConfig) { res.status(400).json({ error: 'No aiConfig provided' }); return }
    const result = await testConnection(aiConfig as AIConfig)
    res.json(result)
  } catch (err) {
    res.status(500).json({ ok: false, message: err instanceof Error ? err.message : 'Unknown error' })
  }
})

const PORT = process.env.PORT ?? 3001
app.listen(PORT, () => {
  console.log(`PCM Coach server running on port ${PORT}`)
})
