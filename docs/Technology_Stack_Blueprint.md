# PCM Organizational Coach — Technology Stack Blueprint

> **Depth:** Implementation-Ready | **Format:** Markdown | **Generated:** 2026-04-25

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Technology Map](#2-technology-map)
3. [Frontend Stack](#3-frontend-stack)
4. [Backend Stack](#4-backend-stack)
5. [Database & ORM](#5-database--orm)
6. [AI Integration Layer](#6-ai-integration-layer)
7. [Authentication & Security](#7-authentication--security)
8. [State Management](#8-state-management)
9. [API Layer](#9-api-layer)
10. [Coding Conventions](#10-coding-conventions)
11. [Implementation Patterns](#11-implementation-patterns)
12. [Directory Structure](#12-directory-structure)
13. [Build & Development Tooling](#13-build--development-tooling)
14. [Environment Configuration](#14-environment-configuration)
15. [Architecture Diagrams](#15-architecture-diagrams)
16. [New Feature Implementation Blueprint](#16-new-feature-implementation-blueprint)

---

## 1. Project Overview

A full-stack **PCM (Process Communication Model)** organizational intelligence platform. HR managers and coaches upload Kahler Communications PCM assessments, visualize personality profiles, analyze team dynamics, and get AI-powered coaching recommendations.

| Property | Value |
|---|---|
| **Monorepo Structure** | `client/` (Vite + React) + `server/` (Node + Express) |
| **Primary Language** | TypeScript (strict mode, v6.0) |
| **Database** | PostgreSQL via Prisma ORM |
| **Auth** | JWT (7-day tokens, role-based) |
| **AI** | Multi-provider: Claude, OpenAI, Gemini, Ollama |
| **i18n** | English + Russian |
| **Dev Command** | `npm run dev` (root — starts both on 5173 + 3001) |

---

## 2. Technology Map

### Full Stack at a Glance

| Layer | Technology | Version | Purpose |
|---|---|---|---|
| Frontend Framework | React | 19.2.4 | UI rendering |
| Build Tool | Vite | 8.0.4 | Dev server + bundler |
| Language (client) | TypeScript | ~6.0.2 | Type safety |
| Language (server) | TypeScript | ^6.0.3 | Type safety |
| CSS Framework | Tailwind CSS | 4.2.2 | Utility-first styling |
| Component Library | shadcn/ui | 4.3.0 | Accessible UI primitives |
| Base UI | @base-ui/react | 1.4.0 | Headless primitives |
| Animations | framer-motion | 12.38.0 | Page/element transitions |
| Icons | lucide-react | 1.8.0 | Icon set |
| State Management | Zustand | 5.0.12 | Global client state |
| Routing | react-router-dom | 7.14.1 | Client-side routing |
| Internationalization | i18next + react-i18next | 26.0.5 / 17.0.4 | EN/RU language toggle |
| Charts | Recharts | 3.8.1 | Bar, Radar, Line charts |
| Graph Layout | @xyflow/react | 12.10.2 | Org Map + Team Network |
| Graph Algorithm | dagre | 0.8.5 | Auto-layout for graphs |
| Notifications | sonner | 2.0.7 | Toast notifications |
| File Picker | react-dropzone | 15.0.0 | PDF upload UI |
| Excel Export | xlsx | 0.18.5 | Spreadsheet export |
| Backend Framework | Express | 5.2.1 | HTTP API server |
| Database | PostgreSQL | — | Relational data store |
| ORM | Prisma | 7.7.0 | DB access + migrations |
| Auth | jsonwebtoken | 9.0.3 | JWT signing/verification |
| Password Hashing | bcryptjs | 3.0.3 | Secure password storage |
| File Upload | multer | 2.1.1 | PDF multipart handling |
| CORS | cors | 2.8.6 | Cross-origin policy |
| AI — Claude | @anthropic-ai/sdk | 0.90.0 | Anthropic Claude API |
| AI — OpenAI | openai | 6.34.0 | OpenAI GPT API |
| AI — Gemini | @google/genai | 1.50.1 | Google Gemini API |
| AI — Ollama | openai (custom baseURL) | 6.34.0 | Local LLM via Ollama |
| Environment | dotenv | 17.4.2 | .env file loading |
| Linting | eslint + typescript-eslint | 9.x / 8.x | Code quality |
| Dev Runner | tsx | 4.21.0 | TS execution (server dev) |
| Concurrent Dev | concurrently | 9.2.1 | Parallel dev scripts |

---

## 3. Frontend Stack

### 3.1 React + Vite

**Entry point:** `client/src/main.tsx`

```tsx
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(<App />)
```

**Vite config** (`client/vite.config.ts`):

```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: { alias: { '@': path.resolve(__dirname, './src') } },
  server: { proxy: { '/api': 'http://localhost:3001' } },
})
```

Key points:
- Path alias `@/` → `./src/` — use everywhere instead of relative imports
- API calls proxied to `http://localhost:3001` in dev
- Tailwind loaded as a Vite plugin (v4 approach — no `tailwind.config.ts`)

### 3.2 TypeScript (Client)

**tsconfig.app.json** highlights:

```json
{
  "target": "es2023",
  "lib": ["ES2023", "DOM", "DOM.Iterable"],
  "module": "esnext",
  "moduleResolution": "bundler",
  "jsx": "react-jsx",
  "noUnusedLocals": true,
  "noUnusedParameters": true,
  "erasableSyntaxOnly": true,
  "ignoreDeprecations": "6.0"
}
```

- Strict `noUnusedLocals`/`noUnusedParameters` — clean up all unused vars
- `erasableSyntaxOnly` — TypeScript-only syntax that erases cleanly
- `ignoreDeprecations: "6.0"` — suppresses TS6 deprecation noise

### 3.3 Tailwind CSS v4

- Config-free — uses CSS `@theme` directives in `client/src/index.css`
- CSS variables (`hsl(var(--primary))`) for theming
- **Important:** CSS variables don't resolve inside SVG attributes — use hardcoded hex (e.g. `#6366f1`) for Recharts `stroke`/`fill`
- Dark mode via `document.documentElement.classList.add('dark')` toggled by localStorage `pcm-theme`

### 3.4 shadcn/ui

**Style:** `base-nova` | **Icon library:** `lucide` | **Base color:** `neutral`

Components live in `client/src/components/ui/`:

| File | Component |
|---|---|
| `badge.tsx` | `Badge` |
| `button.tsx` | `Button` |
| `card.tsx` | `Card`, `CardHeader`, `CardContent`, `CardFooter` |
| `dialog.tsx` | `Dialog`, `DialogContent`, `DialogHeader` |
| `input.tsx` | `Input` |
| `label.tsx` | `Label` |
| `progress.tsx` | `Progress` |
| `select.tsx` | `Select`, `SelectContent`, `SelectItem` |
| `separator.tsx` | `Separator` |
| `sheet.tsx` | `Sheet`, `SheetContent`, `SheetHeader` |
| `skeleton.tsx` | `Skeleton` |
| `tabs.tsx` | `Tabs`, `TabsList`, `TabsTrigger`, `TabsContent` |
| `textarea.tsx` | `Textarea` |
| `tooltip.tsx` | `Tooltip`, `TooltipProvider`, `TooltipContent` |
| `ConfirmDialog.tsx` | Custom confirm modal (delete confirmations) |
| `ExportActions.tsx` | Copy + download buttons for AI results |
| `SaveButton.tsx` | Saves AI output to `SavedOutput` table |

### 3.5 Routing

**Library:** react-router-dom v7 (BrowserRouter + `<Routes>`)

All pages are behind an `AuthGuard` that checks `localStorage.getItem('pcm_token')`. Unauthenticated users are redirected to `/login`.

**Route groups:**
- Core: `/`, `/login`, `/profiles`, `/upload`, `/compare`, `/org-map`, `/network`, `/pcm-explorer`, `/stress-alerts`, `/alerts`
- Groups/Teams: `/groups`, `/groups/:id`, `/teams`, `/teams/:id`
- Admin: `/admin`, `/admin/users`
- HR tools: `/hr-dashboard`, `/hr-departments`, `/hr-role-fit`, `/hr-org-analysis`, `/hr-hiring`, `/hr-retention-risk`, `/hr-team-composer`
- Coaching: `/coaching/session-prep`, `/coaching/conflict`, `/coaching/communication`, `/coaching/meeting`, `/coaching/development-plan`, `/coaching/journey`, `/coaching/simulator`, `/coaching/notes`, `/coaching/goals`, `/coaching/timeline`, `/coaching/analytics`

### 3.6 framer-motion

Version 12 — **do not use `variants` stagger containers**. Use direct `initial/animate` per element with `transition={{ delay }}`:

```tsx
// Correct pattern for v12
<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ delay: index * 0.05 }}
/>
```

### 3.7 @xyflow/react + dagre

- `@xyflow/react` v12 — NodeProps `data` is typed as `Record<string, unknown>`
- Always cast: `String(data.label)`, `Number(data.value)` — never direct cast
- `dagre` for auto-layout of Org Map and Team Network graphs

### 3.8 Recharts

- Used for bar, radar, and line charts
- **Critical:** `hsl(var(--primary))` doesn't resolve in SVG attributes — use hardcoded hex: `#6366f1`

---

## 4. Backend Stack

### 4.1 Express v5

**Entry:** `server/src/index.ts`

```ts
import express from 'express'
import cors from 'cors'
import { requireAuth } from './lib/auth.js'

const app = express()
app.use(cors())
app.use(express.json())
// routes registered here
app.listen(PORT)
```

Express v5 differences from v4:
- Async errors propagate automatically (no need for `next(err)` wrappers)
- `path-to-regexp` v8 syntax for route patterns

### 4.2 TypeScript (Server)

**tsconfig.json** highlights:

```json
{
  "target": "ES2022",
  "module": "CommonJS",
  "moduleResolution": "node",
  "strict": true,
  "esModuleInterop": true,
  "ignoreDeprecations": "6.0"
}
```

- CommonJS modules (not ESM) — use `require`/`module.exports` patterns internally via tsc
- `tsx` used for dev watch mode (`npm run dev`)

### 4.3 Multer

PDF uploads use memory storage (no temp files):

```ts
import multer from 'multer'
const upload = multer({ storage: multer.memoryStorage() })
router.post('/parse-pdf', requireAuth, upload.single('file'), handler)
// Access: req.file.buffer (Buffer)
```

### 4.4 Server Route Files

| File | Prefix | Auth |
|---|---|---|
| `auth.ts` | `/api/auth` | Public (login), requireAuth (me, password) |
| `profiles.ts` | `/api/profiles` | requireAuth; write ops need `profiles_write` or `admin` |
| `teams.ts` | `/api/teams` | requireAuth |
| `groups.ts` | `/api/groups` | requireAuth |
| `users.ts` | `/api/users` | requireRole('admin') |
| `aiConfig.ts` | `/api/ai-config` | requireAuth |
| `coachingNotes.ts` | `/api/coaching-notes` | requireAuth |
| `goals.ts` | `/api/goals` | requireAuth |
| `savedOutputs.ts` | `/api/saved-outputs` | requireAuth |
| `organizations.ts` | `/api/organizations` | requireAuth |
| `auditLog.ts` | `/api/audit-log` | requireRole('admin') |

AI endpoints are registered directly in `index.ts` with inline handlers.

---

## 5. Database & ORM

### 5.1 Prisma Schema Summary

**Provider:** PostgreSQL | **Client preview:** `driverAdapters`

| Model | Key Fields | Notes |
|---|---|---|
| `Organization` | id, name, slug, plan, appTitle | Multi-tenancy root |
| `User` | id, email, password, name, roles[], status, tokenVersion | `roles` is `String[]` |
| `Profile` | id, name, role, department, base, phase, floors(JSON), + 8 more JSON fields | PCM data |
| `Team` | id, name, groupId, orgId | Belongs to Group |
| `Group` | id, name, orgId | Contains Teams |
| `TeamMember` | profileId, teamId | Composite PK pivot |
| `CoachingNote` | id, profileId, authorId, content, isShared | |
| `Goal` | id, profileId, authorId, title, status, dueDate, completedAt | |
| `SavedOutput` | id, profileId, authorId, type, title, content(JSON) | |
| `AIConfig` | id="default", config(JSON) | Singleton row |
| `AuditLog` | id, orgId, userId, userName, action, entity, entityId, entityName | |

### 5.2 JSON Fields on Profile

These PCM dimensions are stored as `Json` in Prisma — type-cast on read:

```
floors, phaseStress, baseStress, perceptionFilters,
interactionStyles, personalityParts, communicationChannels,
preferredEnvironment, psychologicalNeeds
```

### 5.3 Prisma Singleton

```ts
// server/src/lib/prisma.ts
import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()
export default prisma
```

Import from `@/lib/prisma` across all route/service files — never instantiate `PrismaClient` directly.

### 5.4 Database Scripts

```bash
cd server && npm run db:push   # Push schema to DB (no migration file)
npm run seed                    # Creates admin@pcmcoach.com / admin123
```

---

## 6. AI Integration Layer

### 6.1 Multi-Provider Dispatch

**File:** `server/src/services/aiRecommendations.ts` (1157 lines)

All AI features funnel through two core dispatch functions:

```ts
// Routes to correct AI provider based on config
async function dispatch(prompt: string, config?: AIConfig): Promise<string>

// Generic version that returns parsed JSON
async function dispatchRaw<T>(prompt: string, config?: AIConfig): Promise<T>
```

**Provider routing:**

| Config provider | SDK Used | Notes |
|---|---|---|
| `claude` | `@anthropic-ai/sdk` | Default; uses `ANTHROPIC_API_KEY` |
| `openai` | `openai` | Uses `OPENAI_API_KEY` |
| `gemini` | `@google/genai` | Uses `GEMINI_API_KEY` |
| `ollama` | `openai` (custom baseURL) | Local models via Ollama REST API |

**JSON response handling:** All AI responses strip markdown fences before `JSON.parse`:

```ts
const raw = await dispatch(prompt, config)
const clean = raw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim()
return JSON.parse(clean) as T
```

### 6.2 AI Services Exported

| Function | Input | Output |
|---|---|---|
| `generateRecommendations` | profile, lang, config? | Strengths, risks, actions, communication tips |
| `generateTeamRecommendations` | profiles[], teamName, lang, config? | Team coaching guide |
| `generateTeamAnalysis` | profiles[], teamName, lang, config? | Dynamics, blind spots, stress patterns |
| `generateHiringRecommendation` | profiles[], teamName, position?, lang, config? | Good/risky fit types, interview focus |
| `generateDevelopmentPlan` | profile, lang, config?, notes? | Individual dev plan |
| `enhanceDevelopmentPlan` | profile, existingPlan, lang, config? | Enhanced plan |
| `generateTeamComposition` | profiles[], purpose, lang, config? | Composition eval |
| `generateTeamSuggestion` | profiles[], teamSize, purpose, lang, config? | Team suggestion |
| `generateMeetingPrep` | manager, report, lang, config? | 1-on-1 prep |
| `generateSessionPrep` | profile, lang, config?, notes? | Session prep |
| `generateConflictResolution` | profileA, profileB, lang, config? | Mediation guide |
| `generateMeetingFacilitation` | profiles[], teamName, lang, config? | Facilitation guide |
| `generateCoachingJourney` | profile, lang, config? | Long-term plan |
| `generateSimulatorReply` | profile, scenario, userRole, messages[], config? | Chat response |
| `generateCoachHints` | profile, scenario, config? | Opening hints |
| `generateTurnHints` | profile, scenario, messages[], config? | Per-turn hints |
| `generateSimulatorDebrief` | profile, scenario, userRole, messages[], config? | Debrief |
| `generatePCMChatReply` | messages[], currentType?, config? | PCM chatbot reply |
| `testConnection` | aiConfig | Connection verification |

### 6.3 AIConfig Model

Single row in DB (`id = "default"`), `config` field contains:

```ts
interface AIConfigData {
  provider: 'claude' | 'openai' | 'gemini' | 'ollama'
  model: string
  apiKey?: string
  baseUrl?: string  // for Ollama
}
```

Loaded per-request from DB and can be overridden by `aiConfig` in request body.

### 6.4 PDF Parsing

**File:** `server/src/services/pdfParser.ts`

- Uses Claude Vision (`claude-sonnet-4-6`) — PDF base64-encoded as image
- Extracts full PCM profile from Kahler Communications assessment
- Handles Russian type names: `Логик→thinker`, `Упорный→persister`, `Душевный→harmonizer`, `Мечтатель→imaginer`, `Бунтарь→rebel`, `Деятель→promoter`

---

## 7. Authentication & Security

### 7.1 JWT Flow

**File:** `server/src/lib/auth.ts`

```ts
interface JWTPayload {
  userId: string
  email: string
  roles: string[]
  orgId: string | null
  tokenVersion: number
}

// Token: 7-day expiry, HS256
signToken(payload: JWTPayload): string
verifyToken(token: string): JWTPayload
```

- Token stored in `localStorage` as `pcm_token`
- Sent as `Authorization: Bearer <token>` on every request
- `tokenVersion` field enables server-side session invalidation (increment to force re-login)

### 7.2 Middleware

```ts
requireAuth        // Validates Bearer token; attaches user to req
requireRole(...roles)  // 403 if user lacks any of the specified roles
```

`requireRole` passes if user has **ANY** of the listed roles:
```ts
requireRole('profiles_write', 'admin')  // admin OR profiles_write
```

### 7.3 Roles

| Role | Access |
|---|---|
| `admin` | Full access to everything |
| `hr` | HR analytics, profiles (read), teams/groups |
| `coach` | Coaching tools, notes, goals, profiles (read) |
| `profiles_write` | Permission modifier — enables create/edit/delete profiles for hr/coach |

### 7.4 Auth Cache

In-memory cache with 60s TTL in `server/src/lib/auth.ts`:
- Avoids DB round-trip on every authenticated request
- `invalidateAuthCache(userId)` called on deactivation/role change for immediate effect
- `lastSeenAt` updated with 5-minute throttle

### 7.5 Password Security

bcryptjs with default salt rounds:
```ts
const hash = await bcrypt.hash(password, 10)
const valid = await bcrypt.compare(password, hash)
```

---

## 8. State Management

### 8.1 Zustand Store

**File:** `client/src/store/useStore.ts`

```ts
interface AppState {
  profiles: PCMProfile[]
  teams: Team[]
  groups: Group[]
  aiConfig: AIConfig
  stressThreshold: number
  loading: boolean
  initialized: boolean
  
  // Bootstrap — call once on app mount
  init(): Promise<void>
  
  // Profile CRUD
  addProfile(data): Promise<void>
  updateProfile(id, data): Promise<void>
  deleteProfile(id): Promise<void>
  
  // Team CRUD
  addTeam(data): Promise<void>
  updateTeam(id, data): Promise<void>
  deleteTeam(id): Promise<void>
  
  // Group CRUD
  addGroup(data): Promise<void>
  updateGroup(id, data): Promise<void>
  deleteGroup(id): Promise<void>
  
  // AI Config
  updateAIConfig(config): Promise<void>
  
  // Stress threshold
  setStressThreshold(value: number): void
}
```

- `stressThreshold` persisted to `localStorage` as `pcm_stress_threshold` (default: 75)
- `init()` loads profiles, teams, groups, aiConfig from API — call in root component

### 8.2 Auth Store

**File:** `client/src/store/useAuth.ts`

```ts
interface AuthState {
  user: User | null
  hasRole(role: string): boolean
  login(token: string, user: User): void
  logout(): void
}
```

---

## 9. API Layer

### 9.1 Client API Helpers

**File:** `client/src/lib/api.ts`

```ts
// Base request helper
async function request<T>(method: string, path: string, body?: unknown): Promise<T>

// Convenience wrappers
get<T>(path: string): Promise<T>
post<T>(path: string, body: unknown): Promise<T>
put<T>(path: string, body: unknown): Promise<T>
del<T>(path: string): Promise<T>
```

Auto-includes `Authorization: Bearer <token>` header. Auto-logs out (clears `pcm_token`) on 401.

### 9.2 API Modules

```ts
authApi.login(email, password)
authApi.me()
authApi.changePassword(current, next)

profilesApi.list()
profilesApi.get(id)
profilesApi.create(data)
profilesApi.update(id, data)
profilesApi.delete(id)

teamsApi.list() / .get(id) / .create(data) / .update(id, data) / .delete(id)
groupsApi.list() / .get(id) / .create(data) / .update(id, data) / .delete(id)

aiConfigApi.get()
aiConfigApi.save(data)

coachingNotesApi.list(profileId)
coachingNotesApi.create(data)
coachingNotesApi.update(id, data)
coachingNotesApi.delete(id)

usersApi.list() / .create(data) / .update(id, data) / .delete(id)

orgsApi.current()
orgsApi.update(name, appTitle?)
```

---

## 10. Coding Conventions

### 10.1 Naming Conventions

| Entity | Pattern | Example |
|---|---|---|
| React components | PascalCase named export | `export function SessionPrep()` |
| Hooks | camelCase with `use` prefix | `useStore`, `useAuth` |
| API helpers | camelCase module + method | `profilesApi.create(...)` |
| Types/Interfaces | PascalCase | `PCMProfile`, `AIConfig` |
| PCM types (values) | lowercase strings | `'thinker'`, `'rebel'` |
| Files (components) | PascalCase | `StressSequenceCard.tsx` |
| Files (lib/utils) | camelCase | `api.ts`, `utils.ts` |
| CSS variables | kebab-case | `--primary`, `--background` |

### 10.2 TypeScript Rules

- No `any` unless interfacing with raw API responses (e.g., Prisma JSON fields)
- For React Flow v12 NodeProps `data`: use `String(data.label)`, `Number(data.value)` — never direct cast
- Prefer `interface` for object shapes, `type` for unions/aliases
- All components fully typed — props interface defined inline or above component

### 10.3 Component Structure

```tsx
// Page component pattern
import { useState } from 'react'
import { useStore } from '@/store/useStore'
import { Button } from '@/components/ui/button'

interface Props {
  profileId: string
}

export function MyFeature({ profileId }: Props) {
  const { profiles } = useStore()
  const [loading, setLoading] = useState(false)
  
  // ...
  
  return (
    <div>...</div>
  )
}
```

### 10.4 API Call Pattern (in components)

```tsx
async function handleSave() {
  setLoading(true)
  try {
    await profilesApi.update(id, data)
    // update local state if needed
  } finally {
    setLoading(false)
  }
}
```

### 10.5 AI Endpoint Pattern (server)

```ts
// index.ts AI endpoint pattern
app.post('/api/my-feature', requireAuth, async (req, res) => {
  const { profileId, lang = 'en', aiConfig } = req.body
  const profile = await prisma.profile.findUnique({ where: { id: profileId } })
  if (!profile) return res.status(404).json({ error: 'Not found' })
  
  const result = await generateMyFeature(profile as PCMProfile, lang, aiConfig)
  res.json(result)
})
```

### 10.6 i18n Keys

Always add English key — Russian is optional. Key path mirrors component hierarchy:

```json
// en.json
{
  "coaching": {
    "sessionPrep": {
      "title": "Session Prep Generator",
      "generate": "Generate"
    }
  }
}
```

```tsx
const { t } = useTranslation()
<h1>{t('coaching.sessionPrep.title')}</h1>
```

---

## 11. Implementation Patterns

### 11.1 Reusable Components

| Component | Path | Usage |
|---|---|---|
| `PCMTypeBadge` | `components/profile/PCMTypeBadge` | Colored pill for a PCM type |
| `CondominiumTower` | `components/profile/CondominiumTower` | Visual PCM floor tower |
| `StressSequenceCard` | `components/profile/StressSequenceCard` | Degree 1/2/3 stress sequences |
| `PercentageBar` | `components/profile/PercentageBar` | Horizontal percentage bar |
| `AIPanel` | `components/ai/AIPanel` | Reusable AI generation panel |
| `ExportActions` | `components/ui/ExportActions` | Copy + download for AI results |
| `SaveButton` | `components/ui/SaveButton` | Save to `SavedOutput` table |
| `ConfirmDialog` | `components/ui/ConfirmDialog` | Delete confirmation modal |
| `Breadcrumb` | `components/Breadcrumb` | Page breadcrumb navigation |
| `GlobalSearch` | `components/GlobalSearch` | Global profile/team search |

### 11.2 PCM Domain Constants

**File:** `client/src/types/pcm.ts`

```ts
export const PCM_TYPES = ['thinker','persister','harmonizer','imaginer','rebel','promoter'] as const
export type PCMType = typeof PCM_TYPES[number]

export const PCM_TYPE_COLORS: Record<PCMType, string> = {
  thinker:    '#4A90D9',
  persister:  '#7B5EA7',
  harmonizer: '#E8A44B',
  imaginer:   '#A8C4A2',
  rebel:      '#F5C842',
  promoter:   '#D94A4A',
}

export const STRESS_RISK_THRESHOLD = 75
```

- `stressThreshold` is overridden per-org and stored in Zustand + `localStorage` (`pcm_stress_threshold`)
- Profiles where phase floor `percentage < stressThreshold` are flagged at risk

### 11.3 Audit Logging

```ts
// server/src/lib/audit.ts
await createAuditLog({
  orgId: req.user.orgId,
  userId: req.user.userId,
  userName: req.user.name,
  action: 'CREATE',      // CREATE | UPDATE | DELETE
  entity: 'Profile',
  entityId: profile.id,
  entityName: profile.name,
})
```

Call after any mutating operation in route handlers.

### 11.4 Saved Outputs Pattern

```ts
// Server: save AI result
POST /api/saved-outputs
{ profileId, type: 'session-prep', title: '...', content: { ... } }

// Client: SaveButton component handles this automatically
<SaveButton profileId={id} type="session-prep" title="..." content={result} />
```

---

## 12. Directory Structure

```
pcm-organizational-coach/
├── package.json              # Root: concurrently dev script
├── CLAUDE.md                 # Project context for Claude
├── Technology_Stack_Blueprint.md  # This file
│
├── client/
│   ├── index.html            # App shell (theme init script)
│   ├── vite.config.ts        # Vite + Tailwind plugin + proxy
│   ├── tsconfig.json         # References app + node tsconfigs
│   ├── tsconfig.app.json     # App TypeScript settings
│   ├── tsconfig.node.json    # Node TypeScript settings (vite config)
│   ├── components.json       # shadcn/ui config
│   ├── eslint.config.js      # ESLint flat config
│   └── src/
│       ├── main.tsx          # React entry point
│       ├── App.tsx           # Router + AuthGuard + all routes
│       ├── index.css         # Tailwind + CSS variables + theme
│       ├── assets/           # Static assets
│       ├── components/
│       │   ├── ai/           # AIPanel, AI-related components
│       │   ├── layout/       # Sidebar, Header, AppLayout
│       │   ├── profile/      # PCMTypeBadge, CondominiumTower, etc.
│       │   ├── team/         # Team-specific components
│       │   └── ui/           # shadcn/ui primitives + custom UI
│       ├── i18n/
│       │   ├── index.ts      # i18next init
│       │   ├── en.json       # English translations
│       │   └── ru.json       # Russian translations
│       ├── lib/
│       │   ├── api.ts        # All API helpers (authApi, profilesApi, etc.)
│       │   └── utils.ts      # cn() and other utilities
│       ├── pages/
│       │   ├── admin/        # Admin.tsx, UserManagement.tsx
│       │   ├── coaching/     # 11 coaching feature pages
│       │   ├── hr/           # 7 HR analytics pages
│       │   └── [root pages]  # Dashboard, Profiles, Teams, etc.
│       ├── store/
│       │   ├── useStore.ts   # Global app state (Zustand)
│       │   └── useAuth.ts    # Auth state (Zustand)
│       └── types/
│           └── pcm.ts        # PCMType, PCMProfile, constants, colors
│
└── server/
    ├── package.json
    ├── tsconfig.json
    ├── prisma/
    │   └── schema.prisma     # DB schema (11 models)
    └── src/
        ├── index.ts          # Express app, all route mounts, AI endpoints
        ├── seed.ts           # DB seed (admin user)
        ├── lib/
        │   ├── auth.ts       # JWT sign/verify, requireAuth, requireRole, cache
        │   ├── audit.ts      # createAuditLog helper
        │   └── prisma.ts     # Prisma singleton
        ├── routes/           # 11 route files (CRUD resources)
        ├── services/
        │   ├── aiRecommendations.ts  # All 19 AI features + dispatch
        │   └── pdfParser.ts          # Claude Vision PDF extraction
        └── types/
            └── pcm.ts        # Shared PCM TypeScript types
```

---

## 13. Build & Development Tooling

### 13.1 Scripts

```bash
# Root
npm run dev          # Starts client (5173) + server (3001) concurrently

# Client
cd client
npm run dev          # Vite dev server with HMR
npm run build        # tsc --noEmit + vite build
npm run lint         # ESLint (flat config)
npm run preview      # Preview built app

# Server
cd server
npm run dev          # tsx watch src/index.ts
npm run build        # tsc → dist/
npm run start        # node dist/index.js
npm run seed         # ts-node seed.ts (creates admin user)
npm run db:push      # prisma db push (sync schema, no migration)
```

### 13.2 Linting

ESLint flat config (`client/eslint.config.js`):
- `@eslint/js` recommended
- `typescript-eslint` recommended
- `react-hooks/recommended`
- `react-refresh` (Vite HMR)

No Prettier configured — rely on TypeScript strict checks.

---

## 14. Environment Configuration

### 14.1 Server `.env`

```env
DATABASE_URL=postgresql://postgres:123@localhost:5432/pcm_org_intelligence
JWT_SECRET=your-secret-here
ANTHROPIC_API_KEY=your_api_key_here   # Optional if configured via Admin UI
PORT=3001
```

`JWT_SECRET` defaults to `pcm-fallback-secret` if omitted (change in production).

### 14.2 localStorage Keys (Client)

| Key | Purpose | Default |
|---|---|---|
| `pcm_token` | JWT auth token | — |
| `pcm_stress_threshold` | Stress risk threshold | `75` |
| `i18nextLng` | Language preference | `en` |
| `pcm-theme` | UI theme | `light` |

### 14.3 First-Time Setup

```bash
npm install && cd client && npm install && cd ../server && npm install
cd server && npm run db:push
npm run seed
cd .. && npm run dev
# Login: admin@pcmcoach.com / admin123
```

---

## 15. Architecture Diagrams

### 15.1 Technology Stack

```
┌─────────────────────────────────────────────────────────────────┐
│                        BROWSER (port 5173)                       │
│                                                                   │
│  React 19 + TypeScript 6                                         │
│  ┌─────────────────┐  ┌──────────────────┐  ┌────────────────┐  │
│  │  React Router 7  │  │  Zustand 5 Store │  │  react-i18next │  │
│  │  38 page routes  │  │  profiles/teams  │  │  EN + RU       │  │
│  └─────────────────┘  └──────────────────┘  └────────────────┘  │
│  ┌─────────────────┐  ┌──────────────────┐  ┌────────────────┐  │
│  │  Tailwind CSS 4  │  │  shadcn/ui 4     │  │ framer-motion  │  │
│  │  CSS variables   │  │  17 components   │  │ 12             │  │
│  └─────────────────┘  └──────────────────┘  └────────────────┘  │
│  ┌─────────────────┐  ┌──────────────────┐                       │
│  │  Recharts 3     │  │  @xyflow/react   │                       │
│  │  Bar/Radar/Line  │  │  + dagre layout  │                       │
│  └─────────────────┘  └──────────────────┘                       │
└─────────────────────┬───────────────────────────────────────────┘
                      │ fetch /api/* (proxied in dev)
┌─────────────────────▼───────────────────────────────────────────┐
│                     NODE.JS SERVER (port 3001)                   │
│                                                                   │
│  Express 5 + TypeScript 6                                        │
│  ┌─────────────────┐  ┌──────────────────┐  ┌────────────────┐  │
│  │  requireAuth     │  │  requireRole     │  │  multer        │  │
│  │  JWT + cache     │  │  RBAC            │  │  PDF uploads   │  │
│  └─────────────────┘  └──────────────────┘  └────────────────┘  │
│  ┌─────────────────┐  ┌──────────────────┐  ┌────────────────┐  │
│  │  11 CRUD routes  │  │  19 AI endpoints │  │  AuditLog      │  │
│  └─────────────────┘  └──────────────────┘  └────────────────┘  │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │  AI Dispatch Layer (aiRecommendations.ts)                    │ │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │ │
│  │  │  Claude   │  │  OpenAI  │  │  Gemini  │  │  Ollama  │   │ │
│  │  │  Anthropic│  │  GPT-*   │  │  gemini-*│  │  local   │   │ │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │ │
│  └─────────────────────────────────────────────────────────────┘ │
└─────────────────────┬───────────────────────────────────────────┘
                      │ Prisma ORM
┌─────────────────────▼───────────────────────────────────────────┐
│                     POSTGRESQL DATABASE                           │
│                                                                   │
│  Organization → User                                             │
│       ↓              ↓                                           │
│  Profile ←→ TeamMember → Team → Group                           │
│       ↓                                                          │
│  CoachingNote / Goal / SavedOutput                               │
│                                                                   │
│  AIConfig (singleton)                                            │
│  AuditLog                                                        │
└─────────────────────────────────────────────────────────────────┘
```

### 15.2 Data Flow — AI Feature Request

```
Component                   client/src/lib/api.ts           Express              aiRecommendations.ts
    │                               │                           │                        │
    │── POST /api/session-prep ────▶│                           │                        │
    │   { profileId, lang,          │── fetch with JWT ────────▶│                        │
    │     aiConfig? }               │                           │── requireAuth ─────────│
    │                               │                           │── prisma.profile.find ─│
    │                               │                           │                        │
    │                               │                           │── generateSessionPrep──▶│
    │                               │                           │                        │── dispatch(prompt, config)
    │                               │                           │                        │    ├─ Claude SDK
    │                               │                           │                        │    ├─ OpenAI SDK
    │                               │                           │                        │    ├─ Gemini SDK
    │                               │                           │                        │    └─ Ollama (OpenAI baseURL)
    │                               │                           │                        │◀─ raw JSON string
    │                               │                           │◀─ parsed result ───────│
    │◀─ { sessionGoals, ... } ──────│◀─ JSON response ──────────│
```

---

## 16. New Feature Implementation Blueprint

### Checklist: Adding a New AI Feature

**1. Server — Service function** (`server/src/services/aiRecommendations.ts`):
```ts
export async function generateMyFeature(
  profile: PCMProfile,
  lang: string = 'en',
  config?: AIConfigData
): Promise<MyFeatureResult> {
  const prompt = `...PCM-aware prompt...`
  return dispatchRaw<MyFeatureResult>(prompt, config)
}
```

**2. Server — Endpoint** (`server/src/index.ts`):
```ts
app.post('/api/my-feature', requireAuth, async (req, res) => {
  const { profileId, lang = 'en', aiConfig } = req.body
  const profile = await prisma.profile.findUnique({ where: { id: profileId } })
  if (!profile) return res.status(404).json({ error: 'Not found' })
  const result = await generateMyFeature(profile as PCMProfile, lang, aiConfig)
  await createAuditLog({ ...req.user, action: 'AI_GENERATE', entity: 'MyFeature', entityId: profileId })
  res.json(result)
})
```

**3. Client — API helper** (`client/src/lib/api.ts`):
```ts
export async function generateMyFeature(profileId: string, lang: string, aiConfig?: AIConfigData) {
  return post<MyFeatureResult>('/api/my-feature', { profileId, lang, aiConfig })
}
```

**4. Client — Page component** (`client/src/pages/coaching/MyFeature.tsx`):
```tsx
export function MyFeature() {
  const { profiles, aiConfig } = useStore()
  const { t, i18n } = useTranslation()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [result, setResult] = useState<MyFeatureResult | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleGenerate() {
    if (!selectedId) return
    setLoading(true)
    try {
      const data = await generateMyFeature(selectedId, i18n.language, aiConfig)
      setResult(data)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      {/* Profile selector */}
      {/* Generate button */}
      {result && (
        <>
          <ExportActions content={JSON.stringify(result)} />
          <SaveButton profileId={selectedId!} type="my-feature" title="..." content={result} />
          {/* Result display */}
        </>
      )}
    </div>
  )
}
```

**5. Route** (`client/src/App.tsx`):
```tsx
import { MyFeature } from './pages/coaching/MyFeature'
// In Routes:
<Route path="/coaching/my-feature" element={<MyFeature />} />
```

**6. i18n** (`client/src/i18n/en.json`):
```json
{
  "coaching": {
    "myFeature": {
      "title": "My Feature Title"
    }
  }
}
```

### Checklist: Adding a New CRUD Resource

**1. Prisma model** → add to `schema.prisma` → `npm run db:push`
**2. Route file** in `server/src/routes/myResource.ts` with standard CRUD
**3. Mount route** in `server/src/index.ts`: `app.use('/api/my-resource', myResourceRouter)`
**4. API helpers** in `client/src/lib/api.ts`
**5. Zustand store** — add state + actions in `useStore.ts` if resource is global
**6. Page components** — list + detail pages following existing patterns

---

*Blueprint generated by technology-stack-blueprint-generator skill on 2026-04-25*
