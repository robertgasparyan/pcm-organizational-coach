import Anthropic from '@anthropic-ai/sdk'
import OpenAI from 'openai'
import { GoogleGenAI } from '@google/genai'
import type { PCMProfile } from '../types/pcm'

export type AIProvider = 'claude' | 'openai' | 'gemini' | 'ollama'

export interface AIConfig {
  provider: AIProvider
  claude: { apiKey: string; model: string }
  openai: { apiKey: string; model: string }
  gemini: { apiKey: string; model: string }
  ollama: { baseUrl: string; model: string }
}

export interface Recommendations {
  strengths: string[]
  risks: string[]
  actions: string[]
  communicationTips: string[]
}

function buildPrompt(profile: PCMProfile, lang: string): string {
  const langInstruction = lang === 'ru' ? 'Respond in Russian.' : 'Respond in English.'
  return `You are an expert HR consultant and PCM (Process Communication Model) coach.

${langInstruction}

Analyze this PCM profile for HR management purposes and provide actionable recommendations.

PROFILE:
- Name: ${profile.name}
- Role: ${profile.role ?? 'Unknown'}
- Department: ${profile.department ?? 'Unknown'}
- Base type: ${profile.base} (${profile.floors.find(f => f.isBase)?.traits.join(', ') ?? ''})
- Phase type: ${profile.phase} (${profile.floors.find(f => f.isPhase)?.traits.join(', ') ?? ''})
- Phase percentage: ${profile.floors.find(f => f.isPhase)?.percentage ?? 100}%
- Phase stress sequence: 1°: ${profile.phaseStress.degree1} | 2°: ${profile.phaseStress.degree2} | 3°: ${profile.phaseStress.degree3}
- Base stress sequence: 1°: ${profile.baseStress.degree1} | 2°: ${profile.baseStress.degree2} | 3°: ${profile.baseStress.degree3}
- Top psychological needs: ${profile.psychologicalNeeds.slice(0, 3).map(n => n.label).join(', ')}
- Communication channels: ${JSON.stringify(profile.communicationChannels)}

Return a JSON object with exactly these fields:
{
  "strengths": ["3-4 specific strengths this person brings to their team based on their PCM profile"],
  "risks": ["2-3 specific stress risks and conflict patterns to watch for given their type combination"],
  "actions": ["3-4 concrete HR actions to support this person's psychological needs and prevent stress"],
  "communicationTips": ["3-4 specific tips for managers on how to communicate effectively with this person"]
}

Be specific, practical, and grounded in PCM theory. Reference the actual type names and stress patterns.
Return ONLY valid JSON, no markdown, no explanation.`
}

export interface TeamAnalysisResult {
  teamStrengths: string[]
  teamRisks: string[]
  blindSpots: string[]
  teamDynamics: string[]
  stressPatterns: string[]
  managerRecommendations: string[]
}

export interface HiringRecommendationResult {
  goodFitTypes: { type: string; reason: string }[]
  riskyTypes: { type: string; reason: string }[]
  keyQualities: string[]
  interviewFocusAreas: string[]
  onboardingTips: string[]
}

function buildTeamAnalysisPrompt(profiles: PCMProfile[], name: string, lang: string): string {
  const langInstruction = lang === 'ru' ? 'Respond in Russian.' : 'Respond in English.'
  const typeCounts: Record<string, number> = {}
  profiles.forEach(p => { typeCounts[p.base] = (typeCounts[p.base] ?? 0) + 1 })
  const typeBreakdown = Object.entries(typeCounts).map(([t, c]) => `${t}: ${c}`).join(', ')
  const members = profiles.map(p =>
    `- ${p.name} (${p.role ?? 'Unknown'}): Base=${p.base}, Phase=${p.phase}, Phase%=${p.floors.find(f => f.isPhase)?.percentage ?? 100}, TopNeeds=${p.psychologicalNeeds.slice(0, 2).map(n => n.label).join('/')}, StressSeq=${p.phaseStress.degree1}→${p.phaseStress.degree2}→${p.phaseStress.degree3}`
  ).join('\n')
  return `You are an expert PCM (Process Communication Model) coach analysing a team for an HR professional.

${langInstruction}

Provide a deep analysis of this team's PCM composition: their collective strengths, interpersonal risks, what perspectives and capabilities are missing, how the types interact day-to-day, the likely stress patterns that emerge, and concrete recommendations for the manager or HR.

TEAM: ${name}
TYPE DISTRIBUTION: ${typeBreakdown}
MEMBERS:
${members}

PCM TYPES REFERENCE: thinker (logical, organized, responsible, needs recognition of work), persister (dedicated, observant, conscientious, needs recognition of opinions), harmonizer (compassionate, sensitive, warm, needs recognition of person), imaginer (calm, imaginative, reflective, needs solitude/time to think), rebel (spontaneous, creative, playful, needs contact/fun), promoter (adaptable, charming, persuasive, needs incitement/action)

Return a JSON object with EXACTLY these fields:
{
  "teamStrengths": ["3-5 concrete strengths this specific team composition has"],
  "teamRisks": ["2-4 specific conflict patterns, communication friction, or failure modes"],
  "blindSpots": ["2-3 perspectives, values, or capabilities currently missing from this team"],
  "teamDynamics": ["3-4 observations about how these specific types interact — who aligns naturally, who may clash"],
  "stressPatterns": ["2-3 likely stress sequences or group stress behaviours to watch for"],
  "managerRecommendations": ["3-4 concrete, actionable things the manager or HR should do to make this team thrive"]
}

Be specific. Reference actual names and PCM types where relevant.
Return ONLY valid JSON, no markdown, no explanation.`
}

function buildHiringRecommendationPrompt(profiles: PCMProfile[], name: string, position: string | undefined, lang: string): string {
  const langInstruction = lang === 'ru' ? 'Respond in Russian.' : 'Respond in English.'
  const typeCounts: Record<string, number> = {}
  profiles.forEach(p => { typeCounts[p.base] = (typeCounts[p.base] ?? 0) + 1 })
  const typeBreakdown = Object.entries(typeCounts).map(([t, c]) => `${t}: ${c}`).join(', ')
  const members = profiles.map(p =>
    `- ${p.name} (${p.role ?? 'Unknown'}): Base=${p.base}, Phase=${p.phase}`
  ).join('\n')
  const positionLine = position
    ? `POSITION BEING HIRED FOR: ${position}`
    : 'POSITION: Not specified — provide general hiring guidance based on team gaps'
  return `You are an expert PCM (Process Communication Model) HR consultant helping a team hire their next member.

${langInstruction}

Based on the current team's PCM composition${position ? ` and the position being hired for (${position})` : ''}, recommend which PCM types would be a good fit and which types might cause friction, explain what qualities to look for in candidates, provide interview focus areas, and give onboarding tips for integrating the new hire into this specific team.

TEAM: ${name}
${positionLine}
TYPE DISTRIBUTION: ${typeBreakdown}
CURRENT MEMBERS:
${members}

PCM TYPES REFERENCE: thinker (logical, organized, responsible), persister (dedicated, observant, conscientious), harmonizer (compassionate, sensitive, warm), imaginer (calm, imaginative, reflective), rebel (spontaneous, creative, playful), promoter (adaptable, charming, persuasive)

Return a JSON object with EXACTLY these fields:
{
  "goodFitTypes": [
    { "type": "one of the 6 PCM type names", "reason": "specific reason this type complements this team${position ? ' and fits this role' : ''}" },
    { "type": "another PCM type name", "reason": "..." }
  ],
  "riskyTypes": [
    { "type": "PCM type name", "reason": "specific reason this type may clash or be redundant given the current composition" }
  ],
  "keyQualities": ["3-4 qualities or traits to look for in any candidate regardless of PCM type, specific to this team's needs"],
  "interviewFocusAreas": ["3-5 specific things to probe in interviews given this team's dynamics${position ? ' and the role requirements' : ''}"],
  "onboardingTips": ["3-4 practical tips for integrating the new hire into this specific team, referencing the existing type mix"]
}

goodFitTypes should have 1-3 entries. riskyTypes should have 1-2 entries.
Be specific and practical. Reference actual PCM types and team context.
Return ONLY valid JSON, no markdown, no explanation.`
}

// Keep old function for backward compatibility
function buildTeamPrompt(profiles: PCMProfile[], name: string, lang: string): string {
  const langInstruction = lang === 'ru' ? 'Respond in Russian.' : 'Respond in English.'
  const members = profiles.map(p =>
    `- ${p.name} (${p.role ?? 'Unknown'}): Base=${p.base}, Phase=${p.phase}, Phase%=${p.floors.find(f => f.isPhase)?.percentage ?? 100}`
  ).join('\n')
  return `You are an expert HR consultant and PCM (Process Communication Model) coach.

${langInstruction}

Analyze this team's PCM composition for HR management purposes.

TEAM: ${name}
MEMBERS:
${members}

Return a JSON object with exactly these fields:
{
  "strengths": ["3-4 collective strengths of this team based on their PCM type mix"],
  "risks": ["2-3 team-level stress risks, communication conflicts, or blind spots"],
  "actions": ["3-4 concrete HR actions to improve team dynamics and prevent group stress"],
  "communicationTips": ["3-4 tips for the team lead on managing this specific type combination"]
}

Return ONLY valid JSON, no markdown, no explanation.`
}

async function callClaude(prompt: string, apiKey: string, model: string): Promise<string> {
  const client = new Anthropic({ apiKey: apiKey || process.env.ANTHROPIC_API_KEY })
  const message = await client.messages.create({
    model,
    max_tokens: 1024,
    system: 'You are an expert PCM coach. Always respond with valid JSON only.',
    messages: [{ role: 'user', content: prompt }],
  })
  return message.content[0].type === 'text' ? message.content[0].text : '{}'
}

async function callOpenAI(prompt: string, apiKey: string, model: string, baseUrl?: string): Promise<string> {
  const client = new OpenAI({
    apiKey: apiKey || 'ollama',
    baseURL: baseUrl,
  })
  const response = await client.chat.completions.create({
    model,
    messages: [
      { role: 'system', content: 'You are an expert PCM coach. Always respond with valid JSON only.' },
      { role: 'user', content: prompt },
    ],
    max_tokens: 1024,
  })
  return response.choices[0]?.message?.content ?? '{}'
}

async function callGemini(prompt: string, apiKey: string, model: string): Promise<string> {
  const ai = new GoogleGenAI({ apiKey: apiKey || process.env.GEMINI_API_KEY! })
  const response = await ai.models.generateContent({
    model,
    contents: prompt,
  })
  return response.text ?? '{}'
}

async function dispatch(prompt: string, config: AIConfig): Promise<Recommendations> {
  let text: string
  switch (config.provider) {
    case 'claude':
      text = await callClaude(prompt, config.claude.apiKey, config.claude.model)
      break
    case 'openai':
      text = await callOpenAI(prompt, config.openai.apiKey, config.openai.model)
      break
    case 'gemini':
      text = await callGemini(prompt, config.gemini.apiKey, config.gemini.model)
      break
    case 'ollama':
      text = await callOpenAI(prompt, 'ollama', config.ollama.model, `${config.ollama.baseUrl}/v1`)
      break
    default:
      throw new Error(`Unknown AI provider: ${config.provider}`)
  }
  // strip markdown fences if any model wraps in ```json
  const clean = text.replace(/^```(?:json)?\n?/m, '').replace(/\n?```$/m, '').trim()
  return JSON.parse(clean) as Recommendations
}

export async function generateRecommendations(
  profile: PCMProfile,
  lang: string,
  config?: AIConfig
): Promise<Recommendations> {
  const prompt = buildPrompt(profile, lang)
  if (config) return dispatch(prompt, config)
  // fallback: use env key with Claude
  const text = await callClaude(prompt, process.env.ANTHROPIC_API_KEY ?? '', 'claude-sonnet-4-6')
  const clean = text.replace(/^```(?:json)?\n?/m, '').replace(/\n?```$/m, '').trim()
  return JSON.parse(clean) as Recommendations
}

export async function generateTeamRecommendations(
  profiles: PCMProfile[],
  teamName: string,
  lang: string,
  config?: AIConfig
): Promise<Recommendations> {
  const prompt = buildTeamPrompt(profiles, teamName, lang)
  if (config) return dispatch(prompt, config)
  const text = await callClaude(prompt, process.env.ANTHROPIC_API_KEY ?? '', 'claude-sonnet-4-6')
  const clean = text.replace(/^```(?:json)?\n?/m, '').replace(/\n?```$/m, '').trim()
  return JSON.parse(clean) as Recommendations
}

async function dispatchRaw<T>(prompt: string, config?: AIConfig): Promise<T> {
  let text: string
  if (config) {
    switch (config.provider) {
      case 'claude': text = await callClaude(prompt, config.claude.apiKey, config.claude.model); break
      case 'openai': text = await callOpenAI(prompt, config.openai.apiKey, config.openai.model); break
      case 'gemini': text = await callGemini(prompt, config.gemini.apiKey, config.gemini.model); break
      case 'ollama': text = await callOpenAI(prompt, 'ollama', config.ollama.model, `${config.ollama.baseUrl}/v1`); break
      default: throw new Error(`Unknown provider: ${(config as any).provider}`)
    }
  } else {
    text = await callClaude(prompt, process.env.ANTHROPIC_API_KEY ?? '', 'claude-sonnet-4-6')
  }
  const clean = text.replace(/^```(?:json)?\n?/m, '').replace(/\n?```$/m, '').trim()
  return JSON.parse(clean) as T
}

export async function generateTeamAnalysis(
  profiles: PCMProfile[],
  teamName: string,
  lang: string,
  config?: AIConfig
): Promise<TeamAnalysisResult> {
  return dispatchRaw<TeamAnalysisResult>(buildTeamAnalysisPrompt(profiles, teamName, lang), config)
}

export async function generateHiringRecommendation(
  profiles: PCMProfile[],
  teamName: string,
  position: string | undefined,
  lang: string,
  config?: AIConfig
): Promise<HiringRecommendationResult> {
  return dispatchRaw<HiringRecommendationResult>(buildHiringRecommendationPrompt(profiles, teamName, position, lang), config)
}

export interface MeetingPrepResult {
  opening: string[]
  doList: string[]
  dontList: string[]
  feedbackApproach: string[]
  stressWarnings: string[]
  samplePhrases: string[]
}

function buildMeetingPrepPrompt(manager: PCMProfile, report: PCMProfile, lang: string): string {
  const langInstruction = lang === 'ru' ? 'Respond in Russian.' : 'Respond in English.'
  return `You are an expert PCM (Process Communication Model) coach preparing a manager for a 1-on-1 meeting.

${langInstruction}

PERSON INITIATING THE MEETING (Manager/Peer):
- Name: ${manager.name}
- Base type: ${manager.base}, Phase type: ${manager.phase}
- Communication channels: ${JSON.stringify(manager.communicationChannels)}
- Top psychological needs: ${manager.psychologicalNeeds.slice(0, 2).map(n => n.label).join(', ')}

PERSON BEING MET WITH:
- Name: ${report.name}
- Role: ${report.role ?? 'Unknown'}
- Base type: ${report.base}, Phase type: ${report.phase}
- Phase percentage: ${report.floors.find(f => f.isPhase)?.percentage ?? 100}%
- Top psychological needs: ${report.psychologicalNeeds.slice(0, 3).map(n => n.label).join(', ')}
- Communication channels (preferred): ${JSON.stringify(report.communicationChannels)}
- Phase stress 1°: ${report.phaseStress.degree1}
- Phase stress 2°: ${report.phaseStress.degree2}

Generate a practical 1-on-1 meeting preparation brief for ${manager.name} to meet with ${report.name}.

Return a JSON object with exactly these fields:
{
  "opening": ["2-3 specific ways to open this meeting that will put ${report.name} at ease based on their PCM type"],
  "doList": ["3-4 concrete things ${manager.name} should DO during this meeting given ${report.name}'s type and needs"],
  "dontList": ["3-4 specific things to AVOID — actions or phrases that would trigger stress in ${report.name}"],
  "feedbackApproach": ["2-3 specific tips on HOW to deliver feedback or difficult messages to this person based on their PCM type"],
  "stressWarnings": ["2-3 specific behavioural signals that ${report.name} is entering stress DURING the meeting — and what to do immediately"],
  "samplePhrases": ["3-4 exact phrases or sentence starters that work well with ${report.name}'s PCM type"]
}

Be very specific. Reference actual PCM type names, psychological needs, and stress patterns. Return ONLY valid JSON.`
}

export async function generateMeetingPrep(
  manager: PCMProfile,
  report: PCMProfile,
  lang: string,
  config?: AIConfig
): Promise<MeetingPrepResult> {
  const prompt = buildMeetingPrepPrompt(manager, report, lang)
  if (config) {
    const text = await (async () => {
      switch (config.provider) {
        case 'claude': return callClaude(prompt, config.claude.apiKey, config.claude.model)
        case 'openai': return callOpenAI(prompt, config.openai.apiKey, config.openai.model)
        case 'gemini': return callGemini(prompt, config.gemini.apiKey, config.gemini.model)
        case 'ollama': return callOpenAI(prompt, 'ollama', config.ollama.model, `${config.ollama.baseUrl}/v1`)
        default: throw new Error(`Unknown provider: ${config.provider}`)
      }
    })()
    const clean = text.replace(/^```(?:json)?\n?/m, '').replace(/\n?```$/m, '').trim()
    return JSON.parse(clean) as MeetingPrepResult
  }
  const text = await callClaude(prompt, process.env.ANTHROPIC_API_KEY ?? '', 'claude-sonnet-4-6')
  const clean = text.replace(/^```(?:json)?\n?/m, '').replace(/\n?```$/m, '').trim()
  return JSON.parse(clean) as MeetingPrepResult
}

// ─── Session Prep ─────────────────────────────────────────────────────────────
export interface SessionPrepResult {
  sessionGoals: string[]
  openingQuestions: string[]
  deepDiveQuestions: string[]
  warningSignals: string[]
  closingApproach: string[]
}

function buildSessionPrepPrompt(profile: PCMProfile, lang: string, notes?: string[]): string {
  const langInstruction = lang === 'ru' ? 'Respond in Russian.' : 'Respond in English.'
  const notesSection = notes && notes.length > 0
    ? `\nRECENT COACHING NOTES (written by the coach about this person, most recent first):\n${notes.map((n, i) => `${i + 1}. ${n}`).join('\n')}\n\nUse these notes to personalize your session prep — reference specific observations or patterns where relevant. Do not simply repeat the notes; synthesize them into targeted coaching guidance.\n`
    : ''
  return `You are an expert PCM (Process Communication Model) executive coach preparing a coaching session.
${langInstruction}

CLIENT PROFILE:
- Name: ${profile.name}
- Role: ${profile.role ?? 'Unknown'}
- Base type: ${profile.base}, Phase type: ${profile.phase}
- Phase energy: ${profile.floors.find(f => f.isPhase)?.percentage ?? 100}%
- Psychological needs: ${profile.psychologicalNeeds.slice(0, 3).map(n => n.label).join(', ')}
- Phase stress sequence: 1°: ${profile.phaseStress.degree1} | 2°: ${profile.phaseStress.degree2} | 3°: ${profile.phaseStress.degree3}
- Communication channels: ${JSON.stringify(profile.communicationChannels)}
${notesSection}
Generate a structured coaching session preparation brief.

Return a JSON object with exactly these fields:
{
  "sessionGoals": ["2-3 recommended focus areas for this session based on the client's PCM type and current phase energy${notes && notes.length > 0 ? ', informed by the coaching notes above' : ''}"],
  "openingQuestions": ["3-4 specific opening questions that will engage this person based on their PCM type and psychological needs"],
  "deepDiveQuestions": ["4-5 deep coaching questions tailored to this person's type, stress patterns, and needs${notes && notes.length > 0 ? ' — reference patterns from the coaching notes where relevant' : ''}"],
  "warningSignals": ["2-3 specific behavioral cues that this person is entering stress during the session and how to respond"],
  "closingApproach": ["2-3 tips on how to close the session effectively for this specific PCM type"]
}

Be specific, reference the actual PCM type names and psychological needs. Return ONLY valid JSON.`
}

export async function generateSessionPrep(
  profile: PCMProfile,
  lang: string,
  config?: AIConfig,
  notes?: string[]
): Promise<SessionPrepResult> {
  const prompt = buildSessionPrepPrompt(profile, lang, notes)
  const raw = config
    ? await (async () => {
        switch (config.provider) {
          case 'claude': return callClaude(prompt, config.claude.apiKey, config.claude.model)
          case 'openai': return callOpenAI(prompt, config.openai.apiKey, config.openai.model)
          case 'gemini': return callGemini(prompt, config.gemini.apiKey, config.gemini.model)
          case 'ollama': return callOpenAI(prompt, 'ollama', config.ollama.model, `${config.ollama.baseUrl}/v1`)
          default: throw new Error(`Unknown provider: ${config.provider}`)
        }
      })()
    : await callClaude(prompt, process.env.ANTHROPIC_API_KEY ?? '', 'claude-sonnet-4-6')
  const clean = raw.replace(/^```(?:json)?\n?/m, '').replace(/\n?```$/m, '').trim()
  return JSON.parse(clean) as SessionPrepResult
}

// ─── Conflict Resolution ──────────────────────────────────────────────────────
export interface ConflictResolutionResult {
  rootCauses: string[]
  perspectiveA: string[]
  perspectiveB: string[]
  mediationSteps: string[]
  communicationBridge: string[]
  whatToAvoid: string[]
  longTermSuggestions: string[]
}

function buildConflictPrompt(a: PCMProfile, b: PCMProfile, lang: string): string {
  const langInstruction = lang === 'ru' ? 'Respond in Russian.' : 'Respond in English.'
  return `You are an expert PCM (Process Communication Model) coach specializing in conflict resolution.
${langInstruction}

PERSON A:
- Name: ${a.name}, Role: ${a.role ?? 'Unknown'}
- Base: ${a.base}, Phase: ${a.phase}, Phase energy: ${a.floors.find(f => f.isPhase)?.percentage ?? 100}%
- Psychological needs: ${a.psychologicalNeeds.slice(0, 3).map(n => n.label).join(', ')}
- Stress sequence: ${a.phaseStress.degree1} → ${a.phaseStress.degree2} → ${a.phaseStress.degree3}

PERSON B:
- Name: ${b.name}, Role: ${b.role ?? 'Unknown'}
- Base: ${b.base}, Phase: ${b.phase}, Phase energy: ${b.floors.find(f => f.isPhase)?.percentage ?? 100}%
- Psychological needs: ${b.psychologicalNeeds.slice(0, 3).map(n => n.label).join(', ')}
- Stress sequence: ${b.phaseStress.degree1} → ${b.phaseStress.degree2} → ${b.phaseStress.degree3}

Analyze the likely conflict dynamics between these two people based on their PCM types.

Return a JSON object with exactly these fields:
{
  "rootCauses": ["2-3 structural reasons why these two PCM types tend to clash — based on their differing needs and perceptions"],
  "perspectiveA": ["2-3 things ${a.name} likely feels or needs that ${b.name} may not be providing"],
  "perspectiveB": ["2-3 things ${b.name} likely feels or needs that ${a.name} may not be providing"],
  "mediationSteps": ["4-5 concrete mediation steps a coach should take to help these two resolve tension"],
  "communicationBridge": ["3-4 specific communication approaches that work for BOTH types simultaneously"],
  "whatToAvoid": ["3-4 things a mediator should never do or say with this specific type combination"],
  "longTermSuggestions": ["2-3 structural suggestions to prevent recurring conflict between these types"]
}

Return ONLY valid JSON.`
}

export async function generateConflictResolution(
  profileA: PCMProfile,
  profileB: PCMProfile,
  lang: string,
  config?: AIConfig
): Promise<ConflictResolutionResult> {
  const prompt = buildConflictPrompt(profileA, profileB, lang)
  const raw = config
    ? await (async () => {
        switch (config.provider) {
          case 'claude': return callClaude(prompt, config.claude.apiKey, config.claude.model)
          case 'openai': return callOpenAI(prompt, config.openai.apiKey, config.openai.model)
          case 'gemini': return callGemini(prompt, config.gemini.apiKey, config.gemini.model)
          case 'ollama': return callOpenAI(prompt, 'ollama', config.ollama.model, `${config.ollama.baseUrl}/v1`)
          default: throw new Error(`Unknown provider: ${config.provider}`)
        }
      })()
    : await callClaude(prompt, process.env.ANTHROPIC_API_KEY ?? '', 'claude-sonnet-4-6')
  const clean = raw.replace(/^```(?:json)?\n?/m, '').replace(/\n?```$/m, '').trim()
  return JSON.parse(clean) as ConflictResolutionResult
}

// ─── Meeting Facilitation ─────────────────────────────────────────────────────
export interface MeetingFacilitationResult {
  agenda: string[]
  facilitationTips: string[]
  typeSpecificNotes: { name: string; type: string; tip: string }[]
  dynamicsToWatch: string[]
  decisionMakingApproach: string[]
  closingTechnique: string[]
}

function buildFacilitationPrompt(profiles: PCMProfile[], teamName: string, lang: string): string {
  const langInstruction = lang === 'ru' ? 'Respond in Russian.' : 'Respond in English.'
  const members = profiles.map(p =>
    `- ${p.name} (${p.role ?? 'Unknown'}): Base=${p.base}, Phase=${p.phase}, Needs=${p.psychologicalNeeds.slice(0, 2).map(n => n.label).join('/')}`
  ).join('\n')
  return `You are an expert PCM (Process Communication Model) coach facilitating a team meeting.
${langInstruction}

TEAM: ${teamName}
MEMBERS:
${members}

Generate a meeting facilitation guide for this specific team composition.

Return a JSON object with exactly these fields:
{
  "agenda": ["4-5 recommended agenda items structured to engage all PCM types present"],
  "facilitationTips": ["4-5 general facilitation techniques that work for this specific type mix"],
  "typeSpecificNotes": [{"name": "person name", "type": "pcm type", "tip": "specific tip for engaging this person in a meeting"}],
  "dynamicsToWatch": ["3-4 group dynamics risks to monitor given this type combination"],
  "decisionMakingApproach": ["2-3 recommendations on how to reach decisions that satisfy all types present"],
  "closingTechnique": ["2-3 ways to close the meeting that leave everyone feeling heard and energized"]
}

Return ONLY valid JSON.`
}

export async function generateMeetingFacilitation(
  profiles: PCMProfile[],
  teamName: string,
  lang: string,
  config?: AIConfig
): Promise<MeetingFacilitationResult> {
  const prompt = buildFacilitationPrompt(profiles, teamName, lang)
  const raw = config
    ? await (async () => {
        switch (config.provider) {
          case 'claude': return callClaude(prompt, config.claude.apiKey, config.claude.model)
          case 'openai': return callOpenAI(prompt, config.openai.apiKey, config.openai.model)
          case 'gemini': return callGemini(prompt, config.gemini.apiKey, config.gemini.model)
          case 'ollama': return callOpenAI(prompt, 'ollama', config.ollama.model, `${config.ollama.baseUrl}/v1`)
          default: throw new Error(`Unknown provider: ${config.provider}`)
        }
      })()
    : await callClaude(prompt, process.env.ANTHROPIC_API_KEY ?? '', 'claude-sonnet-4-6')
  const clean = raw.replace(/^```(?:json)?\n?/m, '').replace(/\n?```$/m, '').trim()
  return JSON.parse(clean) as MeetingFacilitationResult
}

// ── Development Plan ─────────────────────────────────────────────────────────

export interface DevelopmentPlanResult {
  summary: string
  strengthsToLeverage: string[]
  developmentAreas: string[]
  suggestedActivities: string[]
  day30: string[]
  day60: string[]
  day90: string[]
  howToPresentPlan: string[]
}

function buildDevelopmentPlanPrompt(profile: PCMProfile, lang: string, notes?: string[]): string {
  const langInstruction = lang === 'ru' ? 'Respond in Russian.' : 'Respond in English.'
  const phaseFloor = profile.floors.find(f => f.isPhase)
  return `You are an expert PCM (Process Communication Model) coach creating a personalised development plan.

${langInstruction}

Create a practical, actionable development plan for this person based on their PCM profile.
Be concrete and specific — reference their actual type names, needs, and stress patterns throughout.

PROFILE:
- Name: ${profile.name}
- Role: ${profile.role ?? 'Unknown'}
- Department: ${profile.department ?? 'Unknown'}
- Base type: ${profile.base} — traits: ${profile.floors.find(f => f.isBase)?.traits.join(', ') ?? ''}
- Phase type: ${profile.phase} — energy: ${phaseFloor?.percentage ?? 100}%
- Top psychological needs: ${profile.psychologicalNeeds.slice(0, 3).map(n => `${n.label} (${n.percentage}%)`).join(', ')}
- Phase stress sequence: ${profile.phaseStress.degree1} → ${profile.phaseStress.degree2} → ${profile.phaseStress.degree3}
- Base stress sequence: ${profile.baseStress.degree1} → ${profile.baseStress.degree2} → ${profile.baseStress.degree3}
- Communication channels: ${JSON.stringify(profile.communicationChannels)}
${notes && notes.length > 0 ? `\nRECENT COACHING NOTES (written by the coach about this person, most recent first):\n${notes.map((n, i) => `${i + 1}. ${n}`).join('\n')}\n\nIncorporate insights from these notes into the development plan — if specific patterns, challenges, or strengths are mentioned, reference them directly in your recommendations.\n` : ''}
Return a JSON object with EXACTLY these fields:
{
  "summary": "2-3 sentence overview of this person's development focus and what makes them distinctive",
  "strengthsToLeverage": ["3-4 concrete strengths to build on, specific to their PCM type combination"],
  "developmentAreas": ["3-4 growth areas, grounded in their type's natural blind spots or stress patterns"],
  "suggestedActivities": ["4-5 specific activities, exercises or practices tailored to their PCM type — not generic advice"],
  "day30": ["2-3 concrete goals or actions for the first 30 days"],
  "day60": ["2-3 concrete goals or actions for days 31-60, building on day 30"],
  "day90": ["2-3 concrete goals or actions for days 61-90, toward longer-term growth"],
  "howToPresentPlan": ["2-3 tips for the coach on how to frame and present this plan in a way that resonates with this PCM type"]
}

Return ONLY valid JSON, no markdown, no explanation.`
}

export async function generateDevelopmentPlan(
  profile: PCMProfile,
  lang: string,
  config?: AIConfig,
  notes?: string[]
): Promise<DevelopmentPlanResult> {
  return dispatchRaw<DevelopmentPlanResult>(buildDevelopmentPlanPrompt(profile, lang, notes), config)
}

function buildEnhancePlanPrompt(profile: PCMProfile, existingPlan: DevelopmentPlanResult, lang: string): string {
  const langInstruction = lang === 'ru' ? 'Respond entirely in Russian.' : 'Respond in English.'
  const phaseFloor = profile.floors.find(f => f.isPhase)
  return `You are a PCM (Process Communication Model) coaching expert. A coach has manually written a development plan for ${profile.name}.

${langInstruction}

PROFILE:
- Name: ${profile.name}
- Base type: ${profile.base} — strengths: ${profile.floors.find(f => f.isBase)?.traits.join(', ') ?? ''}
- Phase type: ${profile.phase} — energy: ${phaseFloor?.percentage ?? 100}%
- Psychological needs: ${profile.psychologicalNeeds.slice(0, 3).map((n: any) => n.label).join(', ')}
- Stress pattern: ${profile.phaseStress.degree1} → ${profile.phaseStress.degree2} → ${profile.phaseStress.degree3}

COACH'S EXISTING PLAN:
${JSON.stringify(existingPlan, null, 2)}

Your task — enhance and enrich this plan:
1. Preserve the coach's content — build on it, do not remove or contradict it
2. Add PCM-specific insights the coach may have missed (tie strengths/areas/activities to the person's specific type)
3. If any section is empty or sparse, fill it with relevant PCM-based content
4. Deepen "howToPresentPlan" with communication channel advice specific to the ${profile.base}/${profile.phase} type
5. Make language concrete and actionable

Return the enhanced plan with EXACTLY this JSON shape:
{
  "summary": "...",
  "strengthsToLeverage": ["...", ...],
  "developmentAreas": ["...", ...],
  "suggestedActivities": ["...", ...],
  "day30": ["...", ...],
  "day60": ["...", ...],
  "day90": ["...", ...],
  "howToPresentPlan": ["...", ...]
}

Return ONLY valid JSON.`
}

export async function enhanceDevelopmentPlan(
  profile: PCMProfile,
  existingPlan: DevelopmentPlanResult,
  lang: string,
  config?: AIConfig
): Promise<DevelopmentPlanResult> {
  return dispatchRaw<DevelopmentPlanResult>(buildEnhancePlanPrompt(profile, existingPlan, lang), config)
}

// ── Team Composer ─────────────────────────────────────────────────────────────

export interface TeamCompositionResult {
  balanceScore: 'Excellent' | 'Good' | 'Moderate' | 'Unbalanced'
  balanceSummary: string
  strengths: string[]
  gaps: string[]
  dynamicsWarnings: string[]
  suggestions: string[]
  idealAddition?: string
}

export interface TeamSuggestionResult {
  suggestedProfiles: string[]  // profile names
  rationale: string[]
  compositionStrengths: string[]
  compositionGaps: string[]
  alternatives: string[]
}

function buildTeamCompositionPrompt(profiles: PCMProfile[], purpose: string | undefined, lang: string): string {
  const langInstruction = lang === 'ru' ? 'Respond in Russian.' : 'Respond in English.'
  const typeCounts: Record<string, number> = {}
  profiles.forEach(p => { typeCounts[p.base] = (typeCounts[p.base] ?? 0) + 1 })
  const typeBreakdown = Object.entries(typeCounts).map(([t, c]) => `${t}: ${c}`).join(', ')
  const members = profiles.map(p =>
    `- ${p.name} (${p.role ?? 'No role'}): Base=${p.base}, Phase=${p.phase}, Phase%=${p.floors.find(f => f.isPhase)?.percentage ?? 100}`
  ).join('\n')
  const purposeLine = purpose ? `TEAM PURPOSE / PROJECT: ${purpose}` : 'TEAM PURPOSE: General / not specified'
  return `You are an expert PCM (Process Communication Model) coach evaluating a team composition.

${langInstruction}

${purposeLine}
TYPE DISTRIBUTION: ${typeBreakdown}
SELECTED MEMBERS:
${members}

PCM TYPES REFERENCE: thinker (logical, precise, organised), persister (dedicated, opinionated, values-driven), harmonizer (empathetic, warm, relational), imaginer (reflective, creative, independent), rebel (spontaneous, energetic, playful), promoter (action-oriented, charming, results-focused)

Evaluate how well this combination of PCM types works${purpose ? ` for the stated purpose` : ''}.

Return a JSON object with EXACTLY these fields:
{
  "balanceScore": "one of: Excellent, Good, Moderate, Unbalanced",
  "balanceSummary": "1-2 sentences on the overall PCM balance of this team",
  "strengths": ["3-4 strengths this specific type combination brings"],
  "gaps": ["2-3 things this team is missing or will struggle with given the PCM mix"],
  "dynamicsWarnings": ["2-3 interpersonal dynamics or friction points to watch for"],
  "suggestions": ["2-3 concrete suggestions to improve how this team works together"],
  "idealAddition": "name of ONE PCM type that would most complement this team (just the type name)"
}

Return ONLY valid JSON, no markdown, no explanation.`
}

function buildTeamSuggestionPrompt(allProfiles: PCMProfile[], teamSize: number, purpose: string, lang: string): string {
  const langInstruction = lang === 'ru' ? 'Respond in Russian.' : 'Respond in English.'
  const profileList = allProfiles.map(p =>
    `- ${p.name} | Role: ${p.role ?? 'Unknown'} | Base: ${p.base} | Phase: ${p.phase} (${p.floors.find(f => f.isPhase)?.percentage ?? 100}%)`
  ).join('\n')
  return `You are an expert PCM (Process Communication Model) coach helping assemble an optimal team.

${langInstruction}

From the available profiles below, select the best ${teamSize} people for the following purpose:
PURPOSE: ${purpose}

AVAILABLE PROFILES:
${profileList}

Select the combination that creates the best PCM type balance for this purpose.
Consider: diversity of types, avoiding too much redundancy, complementary strengths.

Return a JSON object with EXACTLY these fields:
{
  "suggestedProfiles": ["list of exactly ${teamSize} profile names from the available list"],
  "rationale": ["3-4 reasons why this specific combination was chosen"],
  "compositionStrengths": ["3 strengths of this team composition for the stated purpose"],
  "compositionGaps": ["1-2 gaps or risks in this composition"],
  "alternatives": ["1-2 alternative swap suggestions if the first choice isn't available, e.g. 'Replace X with Y because...'"]
}

Return ONLY valid JSON, no markdown, no explanation.`
}

export async function generateTeamComposition(
  profiles: PCMProfile[],
  purpose: string | undefined,
  lang: string,
  config?: AIConfig
): Promise<TeamCompositionResult> {
  return dispatchRaw<TeamCompositionResult>(buildTeamCompositionPrompt(profiles, purpose, lang), config)
}

export async function generateTeamSuggestion(
  allProfiles: PCMProfile[],
  teamSize: number,
  purpose: string,
  lang: string,
  config?: AIConfig
): Promise<TeamSuggestionResult> {
  return dispatchRaw<TeamSuggestionResult>(buildTeamSuggestionPrompt(allProfiles, teamSize, purpose, lang), config)
}

// ── Coaching Journey ──────────────────────────────────────────────────────────

export interface CoachingJourneyResult {
  overview: string
  phases: {
    title: string
    duration: string
    focus: string
    sessions: { topic: string; objective: string; approach: string }[]
    milestone: string
  }[]
  keyPrinciples: string[]
  warningSignsToWatch: string[]
}

function buildCoachingJourneyPrompt(profile: PCMProfile, lang: string): string {
  const langInstruction = lang === 'ru' ? 'Respond in Russian.' : 'Respond in English.'
  const phaseFloor = profile.floors.find(f => f.isPhase)
  return `You are an expert PCM (Process Communication Model) coach designing a structured coaching journey.
${langInstruction}

Design a complete multi-phase coaching journey for this client. Be specific to their PCM type combination throughout.

PROFILE:
- Name: ${profile.name}
- Role: ${profile.role ?? 'Unknown'}
- Department: ${profile.department ?? 'Unknown'}
- Base type: ${profile.base} — traits: ${profile.floors.find(f => f.isBase)?.traits.join(', ') ?? ''}
- Phase type: ${profile.phase} — energy: ${phaseFloor?.percentage ?? 100}%
- Top psychological needs: ${profile.psychologicalNeeds.slice(0, 3).map(n => `${n.label} (${n.percentage}%)`).join(', ')}
- Phase stress sequence: ${profile.phaseStress.degree1} → ${profile.phaseStress.degree2} → ${profile.phaseStress.degree3}
- Base stress sequence: ${profile.baseStress.degree1} → ${profile.baseStress.degree2} → ${profile.baseStress.degree3}
- Communication channels: ${JSON.stringify(profile.communicationChannels)}

Return a JSON object with EXACTLY these fields:
{
  "overview": "2-3 sentence overview of the coaching journey and what it aims to achieve for this specific person",
  "phases": [
    {
      "title": "Phase title (e.g. Foundation, Growth, Mastery)",
      "duration": "suggested duration (e.g. Weeks 1-3)",
      "focus": "the main theme of this phase for this PCM type",
      "sessions": [
        {
          "topic": "session topic",
          "objective": "what this session aims to achieve",
          "approach": "specific PCM-aligned technique for this person's type"
        }
      ],
      "milestone": "measurable sign that this phase is complete"
    }
  ],
  "keyPrinciples": ["3-4 coaching principles to apply throughout, specific to this PCM type combination"],
  "warningSignsToWatch": ["2-3 signs that the journey needs adjustment based on their stress patterns"]
}

Include exactly 3 phases, each with 2-3 sessions. Reference actual PCM type names and psychological needs.
Return ONLY valid JSON, no markdown, no explanation.`
}

export async function generateCoachingJourney(
  profile: PCMProfile,
  lang: string,
  config?: AIConfig
): Promise<CoachingJourneyResult> {
  return dispatchRaw<CoachingJourneyResult>(buildCoachingJourneyPrompt(profile, lang), config)
}

// ── Communication Simulator ───────────────────────────────────────────────────

export interface SimMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface DebriefResult {
  overallAssessment: string
  whatWorkedWell: string[]
  areasToImprove: string[]
  pcmInsights: string[]
  keyMoments: { message: string; feedback: string }[]
  nextPracticeGoals: string[]
}

async function dispatchText(
  systemPrompt: string,
  messages: SimMessage[],
  config?: AIConfig
): Promise<string> {
  const provider = config?.provider ?? 'claude'
  const conversationForGemini = messages
    .map(m => `${m.role === 'user' ? 'Human' : 'Assistant'}: ${m.content}`)
    .join('\n')

  switch (provider) {
    case 'claude': {
      const client = new Anthropic({ apiKey: config?.claude.apiKey || process.env.ANTHROPIC_API_KEY })
      const model = config?.claude.model ?? 'claude-sonnet-4-6'
      const resp = await client.messages.create({
        model,
        max_tokens: 512,
        system: systemPrompt,
        messages: messages.map(m => ({ role: m.role, content: m.content })),
      })
      return resp.content[0].type === 'text' ? resp.content[0].text : ''
    }
    case 'openai': {
      const client = new OpenAI({ apiKey: config!.openai.apiKey })
      const resp = await client.chat.completions.create({
        model: config!.openai.model,
        max_tokens: 512,
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
        ],
      })
      return resp.choices[0]?.message?.content ?? ''
    }
    case 'gemini': {
      const ai = new GoogleGenAI({ apiKey: config!.gemini.apiKey || process.env.GEMINI_API_KEY! })
      const fullPrompt = `${systemPrompt}\n\nConversation so far:\n${conversationForGemini}\n\nContinue as the Assistant:`
      const resp = await ai.models.generateContent({ model: config!.gemini.model, contents: fullPrompt })
      return resp.text ?? ''
    }
    case 'ollama': {
      const client = new OpenAI({ apiKey: 'ollama', baseURL: `${config!.ollama.baseUrl}/v1` })
      const resp = await client.chat.completions.create({
        model: config!.ollama.model,
        max_tokens: 512,
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
        ],
      })
      return resp.choices[0]?.message?.content ?? ''
    }
    default:
      throw new Error(`Unknown provider: ${provider}`)
  }
}

function buildSimulatorSystemPrompt(
  profile: PCMProfile,
  scenario: string,
  userRole: 'coach' | 'coachee'
): string {
  const phaseFloor = profile.floors.find(f => f.isPhase)
  const profileDesc = [
    `Name: ${profile.name}`,
    `Role: ${profile.role ?? 'Unknown'}`,
    `Base PCM type: ${profile.base} — ${profile.floors.find(f => f.isBase)?.traits.join(', ') ?? ''}`,
    `Phase type: ${profile.phase} — energy: ${phaseFloor?.percentage ?? 100}%`,
    `Psychological needs: ${profile.psychologicalNeeds.slice(0, 3).map(n => n.label).join(', ')}`,
    `Stress sequence: ${profile.phaseStress.degree1} → ${profile.phaseStress.degree2} → ${profile.phaseStress.degree3}`,
  ].join('\n')

  if (userRole === 'coach') {
    return `You are roleplaying as ${profile.name}, an employee in a workplace conversation.

PCM PROFILE:
${profileDesc}

SCENARIO: ${scenario}

You are the EMPLOYEE/COACHEE. The user is a coach or manager practicing their skills.

Stay in character as a person with a ${profile.base} base and ${profile.phase} phase:
- Express your psychological needs (${profile.psychologicalNeeds.slice(0, 2).map(n => n.label).join(', ')}) through your responses naturally
- When the user communicates in ways that match your PCM type, be open and engaged
- When communication doesn't match your type, show subtle friction or guardedness
- Show mild stress signals if the conversation triggers your stress pattern
- Be realistic — sometimes cooperative, sometimes challenging, never artificially difficult
- Keep replies conversational and concise (2-5 sentences)
- Never break character or mention PCM`
  } else {
    return `You are an expert PCM (Process Communication Model) coach conducting a coaching session.

THE PERSON YOU ARE COACHING:
${profileDesc}

SCENARIO: ${scenario}

You are the COACH. The user is practicing being coached.

Conduct this as an expert PCM coach:
- Ask powerful, open-ended questions tailored to the ${profile.base}/${profile.phase} type
- Use the right communication channel for this person's type
- Meet their psychological needs: ${profile.psychologicalNeeds.slice(0, 2).map(n => n.label).join(', ')}
- Notice and gently address stress signals if expressed
- Keep responses focused — 2-3 sentences then one question
- Never lecture; coaching is questions and reflection, not advice`
  }
}

export async function generateSimulatorReply(
  profile: PCMProfile,
  scenario: string,
  userRole: 'coach' | 'coachee',
  messages: SimMessage[],
  config?: AIConfig
): Promise<string> {
  const systemPrompt = buildSimulatorSystemPrompt(profile, scenario, userRole)
  return dispatchText(systemPrompt, messages, config)
}

function buildDebriefPrompt(
  profile: PCMProfile,
  scenario: string,
  userRole: 'coach' | 'coachee',
  messages: SimMessage[]
): string {
  const transcript = messages
    .map(m => `${m.role === 'user' ? 'USER' : 'AI PERSONA'}: ${m.content}`)
    .join('\n')
  const roleDesc = userRole === 'coach'
    ? `The user practiced as the COACH speaking with an AI playing ${profile.name} (${profile.base}/${profile.phase} PCM type).`
    : `The user practiced as the COACHEE. The AI played a PCM coach. The user has a ${profile.base}/${profile.phase} profile.`

  return `You are a PCM coaching supervisor providing a session debrief.

SCENARIO: ${scenario}
${roleDesc}

PCM CONTEXT:
- ${profile.name}: Base=${profile.base}, Phase=${profile.phase}
- Needs: ${profile.psychologicalNeeds.slice(0, 3).map(n => n.label).join(', ')}
- Stress: ${profile.phaseStress.degree1} → ${profile.phaseStress.degree2} → ${profile.phaseStress.degree3}

TRANSCRIPT:
${transcript}

Analyze the USER's performance from a PCM coaching perspective.

Return a JSON object with EXACTLY these fields:
{
  "overallAssessment": "2-3 sentence overall assessment of how the user handled this conversation",
  "whatWorkedWell": ["2-4 specific things the user did well — reference actual moments from the conversation"],
  "areasToImprove": ["2-3 specific areas to work on, grounded in PCM principles"],
  "pcmInsights": ["2-3 insights about how PCM type dynamics played out in this conversation"],
  "keyMoments": [
    { "message": "quote or close paraphrase of a specific user message", "feedback": "PCM-based feedback on that moment" }
  ],
  "nextPracticeGoals": ["2-3 concrete goals for the next practice session"]
}

keyMoments: 2-3 entries on the most instructive moments.
Be specific and constructive. Return ONLY valid JSON.`
}

export async function generateSimulatorDebrief(
  profile: PCMProfile,
  scenario: string,
  userRole: 'coach' | 'coachee',
  messages: SimMessage[],
  config?: AIConfig
): Promise<DebriefResult> {
  return dispatchRaw<DebriefResult>(buildDebriefPrompt(profile, scenario, userRole, messages), config)
}

export interface CoachHints {
  pcmTip: string
  openingLines: string[]
}

function buildCoachHintsPrompt(profile: PCMProfile, scenario: string): string {
  const phaseFloor = profile.floors.find(f => f.isPhase)
  return `You are a PCM (Process Communication Model) coaching expert.

A coach is about to start a conversation with this person:
- Name: ${profile.name}
- Base type: ${profile.base}
- Phase type: ${profile.phase} (energy: ${phaseFloor?.percentage ?? 100}%)
- Psychological needs: ${profile.psychologicalNeeds.slice(0, 3).map((n: any) => n.label).join(', ')}
- Stress pattern: ${profile.phaseStress.degree1} → ${profile.phaseStress.degree2} → ${profile.phaseStress.degree3}

SCENARIO: ${scenario}

Your job is to help the coach open this conversation well using PCM principles.

Generate:
1. A concise one-sentence PCM tip about how to communicate with this person (their preferred channel, what they need to hear to feel safe and engaged)
2. Three natural, realistic opening lines the coach could use to start this specific conversation — each should be tailored to both the scenario AND the person's PCM type. They should sound like something a real person would say, not a script.

Return ONLY valid JSON with exactly this shape:
{
  "pcmTip": "...",
  "openingLines": ["...", "...", "..."]
}`
}

export async function generateCoachHints(
  profile: PCMProfile,
  scenario: string,
  config?: AIConfig
): Promise<CoachHints> {
  return dispatchRaw<CoachHints>(buildCoachHintsPrompt(profile, scenario), config)
}

export interface TurnHints {
  observation: string
  suggestions: string[]
}

function buildTurnHintsPrompt(profile: PCMProfile, scenario: string, messages: SimMessage[]): string {
  const transcript = messages
    .map(m => `${m.role === 'user' ? 'COACH' : profile.name}: ${m.content}`)
    .join('\n')
  const lastReply = messages.filter(m => m.role === 'assistant').at(-1)?.content ?? ''

  return `You are a PCM coaching supervisor giving real-time guidance to a coach mid-conversation.

The coach is practicing with: ${profile.name} (Base: ${profile.base}, Phase: ${profile.phase})
Psychological needs: ${profile.psychologicalNeeds.slice(0, 3).map((n: any) => n.label).join(', ')}
Stress pattern: ${profile.phaseStress.degree1} → ${profile.phaseStress.degree2} → ${profile.phaseStress.degree3}
Scenario: ${scenario}

CONVERSATION SO FAR:
${transcript}

${profile.name} just said: "${lastReply}"

Your job:
1. Write a concise one-sentence PCM observation about what's happening right now — what needs, emotions, or stress signals are visible in their last message, and what that means for the coach.
2. Give 2-3 concrete suggestions for what the coach could say or ask next — these should be realistic coach lines, not meta-commentary. Tailor them to the ${profile.base}/${profile.phase} type's preferred communication style.

Return ONLY valid JSON:
{
  "observation": "...",
  "suggestions": ["...", "...", "..."]
}`
}

export async function generateTurnHints(
  profile: PCMProfile,
  scenario: string,
  messages: SimMessage[],
  config?: AIConfig
): Promise<TurnHints> {
  return dispatchRaw<TurnHints>(buildTurnHintsPrompt(profile, scenario, messages), config)
}

// ── PCM Chat ─────────────────────────────────────────────────────────────────

const PCM_EXPERT_SYSTEM_PROMPT = `You are an expert PCM (Process Communication Model) educator and coach with deep knowledge of all 6 personality types.

PCM KNOWLEDGE BASE:

THINKER: Logical, organized, responsible, detail-oriented, precise. Needs recognition of work and accomplishments, time structure, clear expectations. Communication channel: Requestive (logical, fact-based). Perception: Thoughts. Stress: 1° Over-controller (micromanages) → 2° Blamer (criticizes others' competence) → 3° Attacker (hostile criticism). Tips: be precise, provide data, acknowledge thoroughness, give written docs.

PERSISTER: Dedicated, observant, conscientious, opinionated, trustworthy. Needs recognition of opinions and beliefs, to be trusted. Communication channel: Requestive (shares values/opinions). Perception: Opinions. Stress: 1° Preacher (moralistic, pushes values) → 2° Blamer (criticizes ethics/reliability) → 3° Attacker (self-righteous, contemptuous). Tips: ask for their opinion, honor their values, be consistent.

HARMONIZER: Compassionate, sensitive, warm, empathetic, supportive. Needs recognition as a person (not just for work), acceptance, connection. Communication channel: Nurturive (emotional, personal, warm). Perception: Emotions. Stress: 1° Placater (self-blaming, over-accommodates) → 2° Drooper (passive, makes mistakes) → 3° Martyr (silently suffers). Tips: start personally before professionally, show genuine care, never be cold or purely transactional.

IMAGINER: Calm, imaginative, reflective, introverted, independent. Needs solitude and time to think, personal space, freedom from interruption. Communication channel: Directive (clear direct instructions — open questions overwhelm). Perception: Inaction. Stress: 1° Passivator (withdraws, stops initiating) → 2° Dreamer (disconnects from reality) → 3° Immobilizer (completely frozen, cannot decide). Tips: give clear directives not open questions, allow processing time, provide written briefings.

REBEL: Spontaneous, creative, playful, energetic, humorous. Needs fun and playful contact, stimulation and variety. Communication channel: Emotive (playful, energetic, humor). Perception: Reactions. Stress: 1° Blamer (blames others when bored) → 2° Attacker (acts out, provocative) → 3° Despairer (gives up entirely). Tips: use humor, be energetic, give creative latitude, avoid lectures and dry formal communication.

PROMOTER: Adaptable, charming, resourceful, persuasive, results-focused. Needs incitement — challenge, action, direct results. Communication channel: Directive (direct, results-focused). Perception: Actions. Stress: 1° Manipulator (uses others instrumentally) → 2° Blamer (blames others publicly) → 3° Despairer (burns out, loses motivation). Tips: be direct, frame things as challenges, avoid bureaucracy, give real autonomy.

KEY PCM CONCEPTS:
- Base type: the foundation personality type, stable throughout life, defines core strengths and deepest stress behaviors
- Phase type: the current motivational driver, changes over a lifetime (typically once or twice), defines current psychological needs
- Phase energy %: how much energy remains in the current phase — below 75% signals unmet needs and rising stress risk
- Stress sequences: each type has a predictable 3-stage stress escalation when psychological needs go unmet
- Communication channels: the mode of communication each type responds to best (Requestive, Nurturive, Directive, Emotive)
- Perception filters: the lens through which each type experiences the world (Thoughts, Opinions, Emotions, Inaction, Reactions, Actions)
- Psychological needs: the specific things each type must receive to stay energized and out of stress

You are knowledgeable, warm, and educational. You give concrete examples. You help coaches, HR professionals, and managers understand and apply PCM in real workplace situations. Keep answers concise but substantive — 3-6 sentences unless the question genuinely needs more. You may use bullet points for lists. Never make up PCM concepts that don't exist — if uncertain, say so.`

export async function generatePCMChatReply(
  messages: SimMessage[],
  currentType: string | null,
  config?: AIConfig
): Promise<string> {
  const systemPrompt = currentType
    ? `${PCM_EXPERT_SYSTEM_PROMPT}\n\nThe user is currently viewing the ${currentType.charAt(0).toUpperCase() + currentType.slice(1)} type page in the PCM Explorer. You can use this as context if their question seems to relate to it.`
    : PCM_EXPERT_SYSTEM_PROMPT
  return dispatchText(systemPrompt, messages, config)
}

export async function testConnection(config: AIConfig): Promise<{ ok: boolean; message: string }> {
  const ping = 'Reply with exactly: {"ok":true}'
  try {
    await dispatch(ping, config)
    return { ok: true, message: 'Connection successful' }
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : 'Unknown error' }
  }
}
