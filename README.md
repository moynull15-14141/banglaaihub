# Bangla AI Hub

The open, community-driven ecosystem platform for Bangla AI — discovery, community, and infrastructure for Bangla-speaking learners, developers, researchers, and creators.

Full context, decisions, and rationale live in [`project-planning/`](project-planning/00-master-index.md) — start there before changing anything architectural.

## Stack

| Layer | Choice |
|---|---|
| Frontend | Next.js 15 (App Router) + React 19 + TypeScript, deployed on Vercel |
| Backend | Node.js + Express 5 + TypeScript, deployed on Render |
| Database | Supabase — **PostgreSQL only** (no Supabase Auth / Storage / Edge Functions) |
| ORM | Prisma |
| Auth | Custom JWT (access + refresh tokens) |
| File storage | Cloudflare R2 |
| Search | MeiliSearch |
| Package manager | npm (no Docker) |

## Repository layout

```
bangladeshAIHub/
├── frontend/           Next.js app (Vercel)
├── backend/            Express + TypeScript API (Render)
└── project-planning/   All planning docs — architecture, DB design, API spec, security, roadmap
```

`frontend/` and `backend/` are independent npm packages (no workspaces) — each has its own `package.json`, `node_modules`, and deploys to a different platform via that platform's "Root Directory" setting.

## Getting started

```bash
# 1. Use the pinned Node version
nvm use   # reads .nvmrc

# 2. Install dependencies for both apps
npm run install:all

# 3. Copy env templates and fill in real values
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local

# 4. Run both dev servers together
npm run dev
```

Frontend: http://localhost:3000
Backend: http://localhost:5000

## Common scripts (run from repo root)

| Script | Does |
|---|---|
| `npm run dev` | Boots frontend + backend together |
| `npm run build` | Builds both apps |
| `npm run lint` | Lints both apps |
| `npm run typecheck` | Type-checks both apps |
| `npm run format` | Formats the whole repo with Prettier |

## Documentation

See [`project-planning/00-master-index.md`](project-planning/00-master-index.md) for the full document map — foundation, roadmap, technical architecture, database design, API spec, security spec, development standards, and the project initialization guide.
