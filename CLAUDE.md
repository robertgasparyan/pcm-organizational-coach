# PCM Organizational Coach — Claude Context

## What this platform is

A full-stack **PCM (Process Communication Model)** organizational intelligence platform. HR managers and coaches upload Kahler Communications PCM assessments, visualize personality profiles, analyze team dynamics, and get AI-powered coaching recommendations.

**Built by:** Robert Gasparyan
---

## Running the project

```bash
# From repo root — starts both client (5173) and server (3001) concurrently
npm run dev
```

---

## Monorepo structure

```
pcm-organizational-coach/
├── client/          Vite + React + TypeScript frontend
├── server/          Node.js + Express + TypeScript backend
├── CLAUDE.md        This file
```

---

## Tech stack

### Frontend (`client/`)
- **Vite + React + TypeScript**
- **Tailwind CSS v4** + **shadcn/ui** components
- **framer-motion** — page/element animations
- **recharts** — bar, radar, line charts
- **@xyflow/react** + **dagre** — Team Network graph layout
- **zustand** — global state (profiles, teams, groups, aiConfig, stressThreshold)
- **react-i18next** — EN/RU language toggle (stored in localStorage)
- **react-router-dom v6** — client-side routing

### Animation system
Custom easing utilities defined in `client/src/index.css` (`@layer utilities`):
- `ease-ui` — `cubic-bezier(0.23, 1, 0.32, 1)` — strong ease-out for all UI interactions
- `ease-drawer` — `cubic-bezier(0.32, 0.72, 0, 1)` — iOS-style curve for sheets/drawers
- `ease-smooth` — `cubic-bezier(0.77, 0, 0.175, 1)` — strong ease-in-out for on-screen movement
- `animate-spin` overridden to `0.6s` (faster perceived loading)

Use `ease-ui` on all interactive element transitions. Never use `transition-all` — specify exact properties.

### Backend (`server/`)
- **Node.js + Express + TypeScript**
- **Prisma** ORM → **PostgreSQL** database
- **JWT auth** — 7-day tokens, `requireAuth` + `requireRole` middleware
- **multer** — PDF file upload handling
- **@anthropic-ai/sdk**, **openai**, **@google/genai** — multi-provider AI

### AI
- Multi-provider dispatch in `server/src/services/aiRecommendations.ts`
- Providers: Claude, OpenAI, Gemini, Ollama (Ollama reuses OpenAI client with custom baseURL)
- Config stored in DB (`AIConfig` table), loaded per-request
- All AI endpoints accept `aiConfig` in request body
- AI responses are raw JSON — strip markdown fences before `JSON.parse`

---

## Database schema (Prisma)

Key models in `server/prisma/schema.prisma`:

| Model | Key fields |
|---|---|
| `Organization` | id, name, slug, plan, appTitle, userCount, profileCount |
| `User` | id, email, password (hashed), name, roles[], status, orgId, tokenVersion, lastSeenAt |
| `Profile` | id, name, role, department, base, phase, floors(JSON), coachId, orgId + all PCM JSON fields |
| `Team` | id, name, groupId, orgId, members→TeamMember |
| `Group` | id, name, orgId, teams[] |
| `CoachingNote` | id, profileId, authorId, content, isShared |
| `Goal` | id, profileId, authorId, title, status, dueDate, completedAt |
| `SavedOutput` | id, profileId, authorId, type, title, content(JSON) |
| `AIConfig` | id="default", config(JSON) |
| `AuditLog` | id, orgId, userId, userName, action, entity, entityId, entityName |

---

## Auth & roles

JWT stored in `localStorage` as `pcm_token`. Auth cache in-memory with 60s TTL to avoid DB round-trip on every request.

**Roles** (stored as `string[]` on User):
- `admin` — full access
- `hr` — HR analytics, profiles (read), teams/groups
- `coach` — coaching tools, notes, goals, profiles (read)
- `profiles_write` — permission modifier: allows create/edit/delete profiles (without it, hr/coach have read-only)

`requireRole('profiles_write', 'admin')` — passes if user has ANY of the listed roles.

---

## PCM data model

**6 PCM types:** `thinker`, `persister`, `harmonizer`, `imaginer`, `rebel`, `promoter`

Each `PCMProfile` has:
- `base` + `phase` (PCMType)
- `floors[]` — 6 floors with `percentage`, `isBase`, `isPhase`, `traits[]`
- `phaseStress` + `baseStress` — `degree1/2/3` + `failurePattern`
- `perceptionFilters` — opinions/reactions/imagination/actions/sensations/thoughts
- `interactionStyles` — democratic/benevolent/autocratic/free
- `personalityParts` — computer/comforter/director/emoter
- `communicationChannels` — requestive/nurturative/directive/emotive
- `preferredEnvironment` — inGroup/aloneOrPairs/variousGroups/alone
- `psychologicalNeeds[]` — ranked with label + percentage
- `assessmentDate?` — when person took the PCM test (staleness warnings if >1 year)
- `coachId?` — assigned coach (User.id)

**Stress risk threshold:** `STRESS_RISK_THRESHOLD = 75` (exported from `client/src/types/pcm.ts`).
Profiles where phase floor `percentage < stressThreshold` are flagged at risk.
`stressThreshold` is configurable per admin in Organization panel, stored in Zustand + localStorage (`pcm_stress_threshold` key).

**PCM type colors** (`PCM_TYPE_COLORS` in `client/src/types/pcm.ts`):
```
thinker: #4A90D9, persister: #7B5EA7, harmonizer: #E8A44B
imaginer: #A8C4A2, rebel: #F5C842, promoter: #D94A4A
```

---

## All pages & routes

### Core
| Route | Component | Description |
|---|---|---|
| `/` | `Dashboard` | Org stats, type distribution, stress summary |
| `/login` | `Login` | JWT login form |
| `/profiles` | `ProfilesList` | Search, staleness badges, stress badge, profiles_write guard |
| `/profiles/new` | `ManualProfileCreate` | Manual profile creation form |
| `/profiles/:id` | `ProfileDetail` | Tabs: Structure, Stress, Channels, AI. Edit button (name/role/dept/date). Assessment date staleness warning |
| `/profiles/:id/report` | `ProfileReport` | Standalone printable coaching report — personality structure, goals, notes, saved outputs. Auto-triggers print with `?print=1`. No sidebar. |
| `/upload` | `Upload` | PDF drop (AI parse) + manual form with assessment date picker |
| `/groups` | `Groups` | Group cards with PCM strip, team pills, stress warning |
| `/groups/:id` | `GroupDetail` | Tabs: Teams (member avatars, type bars), Distribution, Heatmap, Stress Map, AI |
| `/teams` | `Teams` | Team list with group badge and health score badge |
| `/teams/:id` | `TeamDetail` | Tabs: Members, Distribution, Heatmap, Stress Map, AI. Health score widget above tabs. |
| `/compare` | `Compare` | Up to 4 profiles side-by-side |
| `/stress-alerts` | `StressAlerts` | Filter by risk level/group/team, expandable stress degrees |
| `/alerts` | `AlertsCenter` | Consolidated alerts center — stress + overdue goals |
| `/network` | `TeamNetwork` | React Flow circular: pair compatibility scores, colored edges |
| `/pcm-explorer` | `PCMExplorer` | PCM type reference/learning tool |
| `/saved-outputs` | `SavedOutputs` | Browse and manage saved AI outputs |
| `/admin` | `Admin` | Tabs: AI Settings, User Management, Coach Assignments, Organization, Audit Log |

### HR tools (`/hr-*`)
| Route | Description |
|---|---|
| `/hr-dashboard` | HR overview dashboard |
| `/hr-departments` | Department comparison |
| `/hr-role-fit` | Role-type fit analysis |
| `/hr-org-analysis` | Org-wide PCM analysis |
| `/hr-hiring` | Hiring recommendation |
| `/hr-retention-risk` | Retention risk — scored model, per-type insights, dept breakdown, quick actions |
| `/hr-team-composer` | Team composer (evaluate + suggest) |
| `/hr-team-analysis` | HR team analysis |

### Coaching tools (`/coaching/*`)
| Route | Description |
|---|---|
| `/coaching/session-prep` | Session Prep Generator (AI or manual) |
| `/coaching/conflict` | Conflict Resolution |
| `/coaching/communication` | Communication Scripts |
| `/coaching/meeting` | Meeting Facilitation |
| `/coaching/development-plan` | Development Plan (AI or manual + AI enhance) |
| `/coaching/journey` | Coaching Journey |
| `/coaching/simulator` | Communication Simulator (coach or coachee role, real-time hints) |
| `/coaching/notes` | Coaching Notes (with author attribution) |
| `/coaching/goals` | Goal Tracker |
| `/coaching/timeline` | Profile Timeline |
| `/coaching/analytics` | Coaching Analytics |

---

## Admin panel tabs

`Admin.tsx` — tab state: `'ai' | 'users' | 'assignments' | 'org' | 'log'`

1. **AI Settings** — provider selector (Claude/OpenAI/Gemini/Ollama), model config, test connection, active AI banner at top showing current provider + model
2. **User Management** — create/edit/delete users, First Name + Last Name fields, roles (admin/hr/coach) + permissions (profiles_write)
3. **Coach Assignments** — assign profiles to coaches, stats row (total/assigned/unassigned), coach cards grid, unassigned profiles section
4. **Organization** — org name, app title (shown in sidebar), stress threshold editor (default 75%, resets to default link), stats dashboard (active users, coaches, profile counts, goal stats)
5. **Audit Log** — recent platform activity

---

## Key server API endpoints

### Auth
- `POST /api/auth/login`
- `GET /api/auth/me`
- `PUT /api/auth/password`

### Resources (all require `requireAuth`)
- `GET/POST /api/profiles` — POST requires `profiles_write` or `admin`
- `GET/PUT/DELETE /api/profiles/:id` — PUT/DELETE require `profiles_write` or `admin`
- `GET/POST /api/teams`, `/api/groups`, `/api/users`, `/api/coaching-notes`, `/api/goals`, `/api/saved-outputs`
- `GET /api/goals/stats` — aggregate active/completed/overdue counts
- `GET /api/organizations/current`, `PUT /api/organizations/current`
- `GET /api/audit-log`

### AI endpoints (all require `requireAuth`)
- `POST /api/recommend` — individual coaching recommendations
- `POST /api/team-coaching` — team recommendations
- `POST /api/team-analysis` — team analysis
- `POST /api/recommend-team` — hiring recommendation
- `POST /api/development-plan` — generate development plan
- `POST /api/development-plan/enhance` — enhance manual plan with AI
- `POST /api/session-prep` — generate session prep
- `POST /api/conflict-resolution`
- `POST /api/meeting-facilitation`
- `POST /api/coaching-journey`
- `POST /api/team-composer/evaluate`
- `POST /api/team-composer/suggest`
- `POST /api/simulate` — simulator reply
- `POST /api/simulate/coach-hints` — PCM-aware opening hints for coach
- `POST /api/simulate/turn-hints` — per-turn coaching guidance
- `POST /api/simulate/debrief` — post-session debrief
- `POST /api/pcm-chat` — PCM Explorer chat
- `POST /api/test-connection` — test AI provider connection
- `POST /api/parse-pdf` — parse PCM assessment PDF

---

## Communication Simulator specifics

Two roles: **Coach** (user coaches the AI-played coachee) and **Coachee** (AI coaches the user).

- When role = `coachee`: AI sends the first message on start
- When role = `coach`: user types first; on start, fetch `coach-hints` (opening lines + PCM tip shown in violet panel)
- After each AI reply in coach mode: fetch `turn-hints` (observation + 3 clickable suggestions shown in green panel)
- Turn hints are fire-and-forget — errors silently caught so chat still works

---

## Development Plan & Session Prep — manual mode

Both support **AI Generate** or **Write Manually** mode selector after profile selection.

- Manual editor uses `EditableList` component (numbered rows, add/remove per item)
- Result shows "Manually written" violet badge + Edit button
- Development Plan also has "Enhance with AI" (violet button) — calls `/api/development-plan/enhance` with existing manual plan
- Session Prep manual mode has 5 sections: Session Goals, Opening Questions, Deep Dive Questions, Warning Signals, Closing Approach

---

## Coaching Notes

- Notes have `authorId` (User.id) stored in DB
- GET route batch-fetches author names and returns `authorName` alongside each note
- UI shows "You" for own notes, author name for others

---

## Known technical fixes

- **Recharts in SVG:** `hsl(var(--primary))` doesn't resolve inside SVG attributes. Use hardcoded hex `#6366f1` for Radar stroke/fill.
- **React Flow NodeProps (v12):** `data` typed as `Record<string, unknown>`. Use `String(data.label)`, `Number(data.value)` pattern — never cast directly.
- **framer-motion v12:** Don't use `variants` stagger containers — use direct `initial/animate` per element with `transition={{ delay }}`.
- **Server tsconfig:** `"ignoreDeprecations": "6.0"` suppresses moduleResolution deprecation warning.
- **Auth cache:** In-memory 60s TTL cache in `server/src/lib/auth.ts` avoids DB hit on every request. `invalidateAuthCache(userId)` called on deactivation/role change.

---

## Coding conventions

- All components in TypeScript — no `any` unless interfacing with raw API responses
- shadcn/ui components live in `client/src/components/ui/`
- Page components export a named function (e.g. `export function SessionPrep()`)
- API calls go through `client/src/lib/api.ts` helpers (`profilesApi`, `usersApi`, etc.)
- Auth token: `localStorage.getItem('pcm_token')` — included as `Authorization: Bearer <token>` header
- Zustand store in `client/src/store/useStore.ts` — profiles, teams, groups, aiConfig, stressThreshold
- Auth store in `client/src/store/useAuth.ts` — current user, `hasRole()` helper
- i18n keys in `client/src/i18n/` — always add EN key, RU is optional
- Avoid adding comments, docstrings, or error handling for impossible scenarios
- Prefer editing existing files over creating new ones
- Keep solutions focused — don't add features beyond what was asked

---

## Environment setup

### Required environment variables (`server/.env`)

```env
DATABASE_URL=postgresql://postgres:123@localhost:5432/pcm_org_intelligence
JWT_SECRET=your-secret-here
ANTHROPIC_API_KEY=your_api_key_here
PORT=3001
```

`ANTHROPIC_API_KEY` is optional if admin configures AI via the UI. `JWT_SECRET` defaults to `pcm-fallback-secret` if omitted (change in production).

### First-time setup

```bash
# 1. Install dependencies
npm install
cd client && npm install
cd ../server && npm install

# 2. Push schema to DB (creates all tables)
cd server && npm run db:push

# 3. Seed initial admin user (admin@pcmcoach.com / admin123)
npm run seed

# 4. Start everything
cd .. && npm run dev
```

Default login after seed: **admin@pcmcoach.com** / **admin123** — change password after first login.

---

## Team Health Score

Algorithm in `client/src/lib/teamHealth.ts`. Scores 0–100 from 4 components:

| Component | Weight | Logic |
|---|---|---|
| Stress Safety | 30 pts | % of members whose phase floor % ≥ stressThreshold |
| Coach Coverage | 25 pts | Whether all members have an assigned coach |
| Type Diversity | 25 pts | Unique PCM types present / 6 |
| Assessment Freshness | 20 pts | % of members with assessmentDate within the last year |

Grades: A (85+), B (70+), C (50+), D (<50). Shown as a colored badge on team cards and a detail widget on TeamDetail.

---

## localStorage keys

| Key | Purpose |
|---|---|
| `pcm_token` | JWT auth token |
| `pcm_stress_threshold` | Custom stress risk threshold (default 75) |
| `pcm-lang` | Language preference (`en` or `ru`) |
| `pcm-sidebar-sections` | Collapsed state of sidebar section groups |

---

## Reusable components worth knowing

| Component | Path | Purpose |
|---|---|---|
| `PCMTypeBadge` | `components/profile/PCMTypeBadge` | Colored pill for a PCM type |
| `CondominiumTower` | `components/profile/CondominiumTower` | Visual PCM floor tower display |
| `StressSequenceCard` | `components/profile/StressSequenceCard` | Shows degree 1/2/3 stress sequence |
| `PercentageBar` | `components/profile/PercentageBar` | Horizontal percentage bar |
| `AIPanel` | `components/ai/AIPanel` | Reusable AI generation panel used in Group/Team detail tabs |
| `ExportActions` | `components/ui/ExportActions` | Copy + download buttons for AI results |
| `SaveButton` | `components/ui/SaveButton` | Saves AI output to `SavedOutput` table |
| `ConfirmDialog` | `components/ui/ConfirmDialog` | Reusable delete confirmation modal |
| `Breadcrumb` | `components/Breadcrumb` | Page breadcrumb navigation |
| `GlobalSearch` | `components/GlobalSearch` | Global profile/team search |

---

## Orphaned files (exist but not routed)

These files exist in `client/src/pages/` but have **no route in `App.tsx`**:

- `pages/MeetingPrep.tsx` — 1-on-1 meeting prep (manager + report). API endpoint `POST /api/meeting-prep` exists and works. Re-enable by adding route and import to `App.tsx`.
- `pages/admin/UserManagement.tsx` — Standalone user management page. Functionality absorbed into `Admin.tsx` tabs. Likely obsolete.

---

## Known gaps & planned work

Features that are intentionally missing or incomplete:

- **Meeting Prep** — page and API exist, just needs re-enabling (see orphaned files above).
- **Multi-org isolation** — `orgId` filtering exists on all queries but multi-tenancy UX (org switcher, invites) is not built.
- **Profile re-assessment** — staleness warnings show when assessment is >1 year old, but there's no guided re-upload flow that preserves history with version tracking.
- **Manager-focused view** — filtered HR view with a JWT-scoped shareable link for team leads.
- **Communication templates library** — a `/templates` page for reusable PCM communication scripts.
