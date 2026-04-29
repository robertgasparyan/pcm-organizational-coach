# PCM Organizational Coach

A full-stack organizational intelligence platform built on the **Process Communication Model (PCM)** by Taibi Kahler. HR managers and coaches upload PCM assessments, visualize personality profiles, analyze team dynamics, and get AI-powered coaching recommendations.

---

## Table of Contents

- [What it does](#what-it-does)
- [Tech stack](#tech-stack)
- [Local installation](#local-installation)
- [Live / production deployment](#live--production-deployment)
- [Environment variables](#environment-variables)
- [Default credentials](#default-credentials)
- [Roles & permissions](#roles--permissions)
- [Project structure](#project-structure)

---

## What it does

**Profiles & assessments**
- Upload and AI-parse PCM assessment PDFs, or create profiles manually
- Edit profiles (name, role, department, assessment date) after creation
- Staleness warnings when an assessment is older than one year
- Export a printable coaching report as PDF (personality structure, goals, notes, saved outputs)

**Visualization & analysis**
- Individual profile detail — floors, stress sequences, communication channels, psychological needs
- Side-by-side comparison of up to 4 profiles
- Team network graph — pair compatibility scores, colored relationship edges

**HR analytics** *(hr role)*
- HR dashboard with org-wide type distribution and health metrics
- Department comparison, role-type fit scoring, org-wide PCM analysis
- Hiring recommendation — match candidates to role PCM requirements
- Retention risk analysis — scored risk model with per-type insights and quick actions
- Team composer — evaluate existing teams or generate suggestions
- Team health score — 4-component algorithm (stress safety, coach coverage, type diversity, assessment freshness)
- HR team analysis

**Coaching tools** *(coach role)*
- Session prep generator (AI or write manually)
- Conflict resolution, communication scripts, meeting facilitation
- Development plans (AI generate or manual + AI enhance)
- Coaching journey tracker
- Communication simulator — practice as coach or coachee, with real-time PCM hints
- Coaching notes with author attribution and shared/private visibility
- Goal tracker with overdue alerts and due-date management
- Profile timeline — track changes over time
- Coaching analytics
- Saved outputs — browse and manage all saved AI results

**Platform**
- Alerts center — consolidated view of stress alerts and overdue goals
- PCM type explorer — interactive reference for all 6 types
- Admin panel: AI provider config, user management, coach assignments, org settings, audit log
- EN/RU language toggle
- Light and dark mode

---

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | Vite + React + TypeScript, Tailwind CSS v4, shadcn/ui, Zustand, React Router v6, Framer Motion |
| Backend | Node.js + Express + TypeScript |
| Database | PostgreSQL via Prisma ORM |
| AI | Anthropic Claude, OpenAI, Google Gemini, Ollama (configurable from admin panel) |
| Auth | JWT (7-day tokens, stored in localStorage) |

---

## Local installation

### Prerequisites

Make sure you have the following installed before starting:

- **Node.js** v18 or later — [nodejs.org](https://nodejs.org)
- **PostgreSQL** v14 or later — [postgresql.org](https://www.postgresql.org/download)
- **npm** v9 or later (bundled with Node.js)

---

### Step 1 — Clone the repository

```bash
git clone <your-repo-url>
cd pcm-organizational-coach
```

---

### Step 2 — Create the PostgreSQL database

Open a PostgreSQL prompt (either via `psql` or a GUI like TablePlus / pgAdmin) and run:

```sql
CREATE DATABASE pcm_org_intelligence;
```

If your local PostgreSQL user is not `postgres` or your password is different, note those down — you will need them in Step 4.

---

### Step 3 — Install dependencies

From the **project root**, install all dependencies for the root, client, and server:

```bash
npm install
cd client && npm install && cd ..
cd server && npm install && cd ..
```

---

### Step 4 — Configure the server environment

Create a `.env` file inside the `server/` directory:

```bash
cp server/.env.example server/.env
```

If there is no `.env.example`, create `server/.env` manually with the following content:

```env
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/pcm_org_intelligence
JWT_SECRET=change-this-to-a-long-random-string
PORT=3001

# Optional — only needed if you want AI to work without configuring it via the admin panel
ANTHROPIC_API_KEY=your_anthropic_api_key_here
```

Replace `YOUR_PASSWORD` with your PostgreSQL password and adjust the username if needed.

---

### Step 5 — Push the database schema

This creates all tables in the database using Prisma:

```bash
cd server
npx prisma db push
```

You should see output confirming that the schema has been applied. No data is created yet — it only creates the table structure.

---

### Step 6 — Seed the database

This creates an initial admin user and the default organization:

```bash
npm run seed
```

This only needs to be run once. After seeding, the default login is:

| Field | Value |
|---|---|
| Email | `admin@pcmcoach.com` |
| Password | `admin123` |

**Change this password immediately after first login** via Admin → User Management.

---

### Step 7 — Start the development server

Go back to the project root and start both the frontend and backend together:

```bash
cd ..
npm run dev
```

This starts:
- **Frontend** at `http://localhost:5173`
- **Backend API** at `http://localhost:3001`

---

## Live / production deployment

### Prerequisites

- A server running Linux (Ubuntu 22.04 recommended)
- PostgreSQL installed and running on the server
- Node.js v18+ installed
- A domain name pointed to your server (optional but recommended for SSL)
- A process manager — this guide uses **PM2**

---

### Step 1 — Set up PostgreSQL on the server

```bash
sudo -u postgres psql
```

Inside the PostgreSQL prompt:

```sql
CREATE USER pcmuser WITH PASSWORD 'strong-password-here';
CREATE DATABASE pcm_org_intelligence OWNER pcmuser;
GRANT ALL PRIVILEGES ON DATABASE pcm_org_intelligence TO pcmuser;
\q
```

---

### Step 2 — Clone and install

```bash
git clone <your-repo-url> /var/www/pcm-coach
cd /var/www/pcm-coach

npm install
cd client && npm install && cd ..
cd server && npm install && cd ..
```

---

### Step 3 — Configure environment variables

```bash
nano server/.env
```

```env
DATABASE_URL=postgresql://pcmuser:strong-password-here@localhost:5432/pcm_org_intelligence
JWT_SECRET=a-very-long-random-secret-at-least-32-characters
PORT=3001
ANTHROPIC_API_KEY=your_key_here
```

---

### Step 4 — Push the schema and seed

```bash
cd server
npx prisma db push
npm run seed
cd ..
```

---

### Step 5 — Build the frontend

```bash
cd client
npm run build
cd ..
```

This produces a `client/dist/` folder with the compiled static files.

---

### Step 6 — Configure Nginx

Create a site config at `/etc/nginx/sites-available/pcm-coach`:

```nginx
server {
    listen 80;
    server_name yourdomain.com;

    root /var/www/pcm-coach/client/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable the site and reload:

```bash
sudo ln -s /etc/nginx/sites-available/pcm-coach /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

For HTTPS, use Certbot:

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com
```

---

### Step 7 — Start the server with PM2

```bash
npm install -g pm2

cd /var/www/pcm-coach/server
npm run build
pm2 start dist/index.js --name pcm-coach
pm2 save
pm2 startup
```

`pm2 save` + `pm2 startup` ensure the server restarts automatically after a reboot.

---

### Step 8 — Updating in production

When you push new code:

```bash
cd /var/www/pcm-coach
git pull

# Reinstall if dependencies changed
cd server && npm install && cd ..
cd client && npm install && cd ..

# Apply any new database schema changes
cd server && npx prisma db push && cd ..

# Rebuild frontend
cd client && npm run build && cd ..

# Rebuild and restart backend
cd server && npm run build && cd ..
pm2 restart pcm-coach
```

---

## Environment variables

All variables go in `server/.env`.

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `JWT_SECRET` | Yes | Secret key for signing JWT tokens. Use a long random string in production |
| `PORT` | No | Port for the Express server. Defaults to `3001` |
| `ANTHROPIC_API_KEY` | No | Anthropic API key for Claude. Can also be set via the Admin panel at runtime |

**Note:** All AI providers (Claude, OpenAI, Gemini, Ollama) can be configured from Admin → AI Settings without restarting the server. Environment variables are only a fallback for the initial setup.

---

## Default credentials

After running `npm run seed` for the first time:

| Field | Value |
|---|---|
| Email | `admin@pcmcoach.com` |
| Password | `admin123` |
| Role | `admin` |

Change the password immediately after first login via Admin → User Management.

---

## Roles & permissions

| Role | Access |
|---|---|
| `admin` | Full access to everything |
| `hr` | HR analytics, profiles (read), teams and groups |
| `coach` | Coaching tools, notes, goals, profiles (read) |
| `profiles_write` | Add-on permission — allows any role to create, edit, and delete profiles |

Roles are assigned in Admin → User Management. A user can have multiple roles.

---

## Project structure

```
pcm-organizational-coach/
├── client/                  Frontend (Vite + React + TypeScript)
│   ├── src/
│   │   ├── pages/           Page components (one per route)
│   │   │   ├── hr/          HR analytics pages
│   │   │   └── coaching/    Coaching tool pages
│   │   ├── components/      Shared UI and feature components
│   │   │   ├── ui/          shadcn/ui base components
│   │   │   ├── ai/          AI panel components
│   │   │   ├── layout/      Sidebar, Layout, nav
│   │   │   └── profile/     PCM-specific display components
│   │   ├── store/           Zustand state (profiles, teams, groups, auth)
│   │   ├── lib/             API helpers, utilities, hooks
│   │   ├── types/           TypeScript types and PCM constants
│   │   └── i18n/            EN/RU translation files
│   └── vite.config.ts
│
├── server/                  Backend (Node.js + Express + TypeScript)
│   ├── src/
│   │   ├── routes/          Express route handlers (one per resource)
│   │   ├── services/        AI provider dispatch, PDF parsing
│   │   └── lib/             Auth middleware, Prisma client
│   ├── prisma/
│   │   └── schema.prisma    Database schema
│   └── .env                 Environment variables (not committed)
│
├── package.json             Root — runs client + server concurrently
├── CLAUDE.md                Developer context for AI-assisted development
└── README.md
```
