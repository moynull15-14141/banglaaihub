# Bangla AI Hub — Project Initialization Guide
**Document:** 15
**Version:** 1.0
**Status:** Draft — Awaiting Execution Approval
**Date:** July 2026

---

## Purpose

This document is the bridge between planning (docs 00–14) and code. It defines exactly how the repository is scaffolded — folder structure, tooling, config files, and the terminal commands to create them — before any business logic is written.

**Nothing in this document has been executed.** No folders, files, or packages have been created on disk. This is a specification to review; once approved, the Terminal Commands section (Part 7) can be run in order to produce the real scaffold.

### How this relates to docs 04 / 12 / 13 / 14

- Stack choices here are not new decisions — they restate what's already locked in [04-technical-architecture.md](04-technical-architecture.md).
- One gap is resolved: doc 14's backend folder example used `.js` filenames (`auth.controller.js`), but doc 04 locks **TypeScript** for the backend. This document uses `.ts` throughout — same structure and naming convention as doc 14, just the correct extension.
- Frontend folder structure matches [12-frontend-architecture.md](12-frontend-architecture.md) exactly; this doc adds the tooling/config layer around it.
- Security-relevant env var rules come from [13-security-specification.md](13-security-specification.md).

---

## 1. Architecture Decision

### Monorepo vs. Multi-Repo → **Monorepo (single Git repo, this one)**

| Factor | Monorepo | Multi-repo |
|---|---|---|
| Frontend/backend contract changes | One atomic commit/PR | Two PRs to keep in sync manually |
| Solo founder overhead | One clone, one issue tracker, one CI setup | 2–3x the repo admin |
| Deployment | Vercel + Render both support a **Root Directory** setting — each deploys only its subfolder from this one repo | No benefit — same deploy either way |
| Shared types (API contracts, Zod schemas) | Trivial to add a `shared/` package later | Requires publishing a versioned package |
| When multi-repo would win | N/A at this stage | Separate teams with independent release cadences, or the backend serving multiple unrelated frontends |

**Recommendation:** Monorepo, and specifically the **simple** version — plain folders (`frontend/`, `backend/`), each with its own independent `package.json`, no `npm workspaces` / Turborepo / Nx yet. This matches doc 04's "Start Simple, Scale Smart" principle: workspace tooling solves a problem (shared internal packages, coordinated builds) that doesn't exist yet with only two apps and no shared code. Add `npm workspaces` + a `shared/` package only when a real need appears (e.g., duplicating a Zod schema between frontend and backend becomes painful).

### Repo root note

The example in the prompt used a wrapping folder `bangla-ai-hub/` containing `frontend/`, `backend/`, `docs/`. This repo **already is** that root — it's git-initialized at `d:\MoynullHasan\personal\bangladeshAIHub` with `project-planning/` (equivalent to `docs/`) already committed. So there is no outer folder to create; `frontend/` and `backend/` are added as direct siblings of `project-planning/`.

---

## 2. Folder Structure

### Repo root

```
bangladeshAIHub/                  ← existing repo root (git already initialized)
├── frontend/                     ← Next.js 15 app — deploys to Vercel
├── backend/                      ← Express + TypeScript API — deploys to Render
├── project-planning/             ← existing — all planning docs
├── .github/
│   └── workflows/
│       ├── frontend-ci.yml       ← lint + typecheck + build on PR (frontend/**)
│       └── backend-ci.yml        ← lint + typecheck + test on PR (backend/**)
├── .vscode/
│   ├── extensions.json           ← recommended extensions (committed)
│   └── settings.json             ← shared editor settings (committed)
├── .editorconfig
├── .gitignore                    ← existing, needs two small additions (see Part 4)
├── .npmrc                        ← enforces npm as the only package manager
├── .nvmrc                        ← pins Node version
├── .prettierrc.json              ← single shared style for both apps
├── .prettierignore
├── README.md
└── package.json                  ← root orchestrator only (no workspaces)
```

### `frontend/` (from doc 12, unchanged)

```
frontend/
├── app/
│   ├── (public)/                 ← homepage, datasets, papers, tools, search, categories, users, about
│   ├── (auth)/                   ← login, register, verify-email, forgot-password
│   ├── (dashboard)/              ← dashboard, submit, bookmarks, notifications, settings
│   ├── (admin)/                  ← admin panel
│   ├── layout.tsx / not-found.tsx / error.tsx / sitemap.ts
├── components/                   ← ui/, layout/, resource/, dataset/, search/, user/, common/, seo/
├── lib/                          ← api/, hooks/, store/, utils/, constants/
├── types/
├── public/
├── .env.example
├── .env.local                    ← git-ignored, never committed
├── next.config.ts
├── tailwind.config.ts
├── eslint.config.mjs
├── tsconfig.json
└── package.json
```
Full detail already in doc 12 — not repeated here.

### `backend/` (doc 14's structure, ported to TypeScript)

```
backend/
├── src/
│   ├── config/
│   │   ├── database.ts           ← pg Pool / Prisma client setup
│   │   ├── cors.ts
│   │   ├── redis.ts              ← stub only — Redis is Phase 2 per doc 04
│   │   └── r2.ts                 ← Cloudflare R2 S3-compatible client
│   ├── middleware/
│   │   ├── authenticate.ts
│   │   ├── authorize.ts
│   │   ├── rateLimiter.ts
│   │   ├── validate.ts
│   │   ├── upload.ts
│   │   ├── errorHandler.ts
│   │   └── requestLogger.ts
│   ├── routes/
│   │   ├── index.ts
│   │   └── {auth,resources,users,search,comments,notifications,admin}.routes.ts
│   ├── controllers/
│   │   └── {auth,resources,users,search,comments,notifications,admin}.controller.ts
│   ├── services/                 ← business logic layer
│   │   └── {auth,resources,users,search,email,storage,notification,reputation}.service.ts
│   ├── validators/                ← Zod schemas
│   │   └── {auth,resource,user}.validator.ts
│   ├── types/
│   │   ├── express.d.ts          ← augments Express Request with `user`
│   │   ├── resource.ts
│   │   └── user.ts
│   ├── utils/
│   │   └── {slugify,jwt,hash,pagination,auditLog,logger,apiResponse}.ts
│   ├── emails/                   ← HTML templates (unchanged from doc 14)
│   └── app.ts                    ← Express app assembly (middleware stack)
├── prisma/
│   └── schema.prisma             ← generated by `prisma init`, modeled from doc 10
├── migrations/                   ← SQL migration files (if not using Prisma Migrate exclusively)
├── scripts/
│   ├── backup.sh
│   ├── seed.ts
│   └── syncSearch.ts             ← DB → MeiliSearch sync
├── tests/
│   ├── unit/services/
│   └── integration/routes/
├── .env                          ← git-ignored, never committed
├── .env.example
├── eslint.config.mjs
├── tsconfig.json
├── package.json
└── server.ts                     ← entry point (imports app.ts, starts listener)
```

**Why `prisma/` at backend root and not under `src/`:** this is where `prisma init` places it by default and where the Prisma CLI expects `schema.prisma` — fighting that convention buys nothing.

---

## 3. Naming Conventions

Reuses doc 14 verbatim (files, database, JS/TS identifiers, API endpoints) — see that document for the full tables. Two additions specific to initialization:

| Item | Convention | Example |
|---|---|---|
| Root repo package name | `bangla-ai-hub` | `package.json` → `"name": "bangla-ai-hub"` |
| Frontend package name | `banglaai-frontend` | matches doc 12's folder-name convention |
| Backend package name | `banglaai-backend` | matches doc 14's folder-name convention |
| Git branch names | `<type>/<short-description>` | per doc 14 (`feat/`, `fix/`, `docs/`, `refactor/`, `test/`, `chore/`) |
| Env var names | `SCREAMING_SNAKE_CASE`; client-exposed frontend vars prefixed `NEXT_PUBLIC_` | `JWT_ACCESS_SECRET`, `NEXT_PUBLIC_API_URL` |

---

## 4. Environment Variable Strategy

1. **Never commit real secrets.** Only `.env.example` (dummy values) is committed; `.env` / `.env.local` are git-ignored.
2. **Two separate env files** — `frontend/.env.local` and `backend/.env` — never a shared root `.env`. Frontend and backend are deployed to different platforms (Vercel, Render) with independently configured secrets.
3. **`NEXT_PUBLIC_` prefix is a security boundary**, not a style choice — anything with that prefix is bundled into client JS and is public. Never put a secret behind it.
4. **Production secrets live in the platform dashboard** (Vercel Project Settings → Environment Variables; Render → Environment), never in a committed file, even `.env.production`.
5. **Rotate immediately** if a secret is ever accidentally committed (per doc 13).

The exact `.env.example` contents for both apps are already specified in doc 12 (frontend) and doc 13 (backend) — reused as-is, not reproduced again here.

### `.gitignore` — two additions needed

The existing root `.gitignore` already covers `.env*`, `node_modules/`, `.next/`, `dist/`, `build/`. Two gaps to close before scaffolding:

```gitignore
# Add: .vscode is currently fully ignored, but we want to commit
# shared extension recommendations + editor settings. Replace the
# existing ".vscode/" line with:
.vscode/*
!.vscode/extensions.json
!.vscode/settings.json

# Add: TypeScript build artifacts and coverage reports
*.tsbuildinfo
coverage/
.vercel/
```

---

## 5. Config Files

### `.editorconfig` (root)

```ini
root = true

[*]
charset = utf-8
end_of_line = lf
insert_final_newline = true
trim_trailing_whitespace = true
indent_style = space
indent_size = 2

[*.md]
trim_trailing_whitespace = false
```

### `.nvmrc` (root)

```
22
```
Pins Node to the current Active LTS major version. Run `nvm install` / `nvm use` (nvm-windows) to match. Bump this deliberately when the LTS line rolls over — don't let frontend and backend drift onto different Node versions.

### `.npmrc` (root)

```ini
engine-strict=true
```
Combined with an `"engines"` field in each `package.json`, this makes `npm install` hard-fail if someone runs it with an unsupported Node version — cheap insurance against "works on my machine."

### `.prettierrc.json` (root — shared by both apps; Prettier auto-discovers config upward)

```json
{
  "semi": true,
  "singleQuote": true,
  "trailingComma": "all",
  "printWidth": 100,
  "tabWidth": 2,
  "endOfLine": "lf"
}
```
No style rule was locked in docs 00–14, so this is a new (minor, reversible) decision: standard, boring Prettier defaults — optimizing for zero bikeshedding over personal preference.

### `.prettierignore` (root)

```
node_modules
dist
.next
coverage
project-planning
*.md
```
`project-planning/**.md` is excluded so Prettier never reformats the planning docs (tables/Bangla text formatting is intentional there).

### `backend/tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "lib": ["ES2022"],
    "outDir": "dist",
    "rootDir": ".",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "sourceMap": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "baseUrl": ".",
    "paths": { "@/*": ["src/*"] }
  },
  "include": ["src/**/*", "server.ts", "scripts/**/*"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

### `backend/eslint.config.mjs` (ESLint 9 flat config)

```js
import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import prettier from 'eslint-config-prettier'

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  prettier,
  {
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  },
  { ignores: ['dist/', 'node_modules/'] },
)
```

### `frontend/` config files

`create-next-app` (flags in Part 7) generates `next.config.ts`, `tailwind.config.ts`, `eslint.config.mjs` (already wired to `next/core-web-vitals` + TypeScript), and `tsconfig.json` with strict mode on by default — these are accepted as-is. Only addition: install `eslint-config-prettier` and append it to the generated flat config so ESLint and Prettier never fight over formatting rules.

### `.vscode/settings.json` (committed)

```json
{
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": "explicit"
  },
  "files.eol": "\n",
  "typescript.tsdk": "frontend/node_modules/typescript/lib",
  "eslint.workingDirectories": [{ "pattern": "frontend" }, { "pattern": "backend" }]
}
```

### `.vscode/extensions.json` (committed)

```json
{
  "recommendations": [
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "bradlc.vscode-tailwindcss",
    "prisma.prisma",
    "editorconfig.editorconfig",
    "usernamehw.errorlens",
    "yoavbls.pretty-ts-errors",
    "mikestead.dotenv",
    "eamodio.gitlens",
    "christian-kohler.path-intellisense",
    "streetsidesoftware.code-spell-checker",
    "humao.rest-client"
  ]
}
```

---

## 6. VS Code Extensions (why each one)

| Extension | Reason |
|---|---|
| ESLint (dbaeumer) | Surfaces lint errors inline; required for `formatOnSave` fix-all to work |
| Prettier (esbenp) | Consistent formatting, matches root `.prettierrc.json` |
| Tailwind CSS IntelliSense | Autocomplete + hover previews for Tailwind classes (frontend) |
| Prisma | Syntax highlighting + autocomplete for `schema.prisma`, format-on-save for the schema file |
| EditorConfig for VS Code | Enforces `.editorconfig` for anyone whose own settings differ |
| Error Lens | Inline error/warning text instead of hover-only — faster feedback loop |
| Pretty TypeScript Errors | Reformats TS's often-unreadable generic error dumps |
| DotENV | Syntax highlighting for `.env.example` (never for real secrets — nothing renders values) |
| GitLens | Blame/history context without leaving the editor |
| Path Intellisense | Autocomplete for relative import paths |
| Code Spell Checker | Catches typos in identifiers/strings — cheap, high signal-to-noise |
| REST Client (humao) | Quick manual API testing against the Express backend without leaving VS Code |

---

## 7. npm Packages & Scripts

### Root `package.json`

```json
{
  "name": "bangla-ai-hub",
  "private": true,
  "version": "0.1.0",
  "engines": { "node": ">=22.0.0", "npm": ">=10.0.0" },
  "scripts": {
    "dev": "concurrently -n FRONTEND,BACKEND -c blue,green \"npm:dev:frontend\" \"npm:dev:backend\"",
    "dev:frontend": "npm run dev --prefix frontend",
    "dev:backend": "npm run dev --prefix backend",
    "build": "npm run build --prefix frontend && npm run build --prefix backend",
    "lint": "npm run lint --prefix frontend && npm run lint --prefix backend",
    "typecheck": "npm run typecheck --prefix frontend && npm run typecheck --prefix backend",
    "format": "prettier --write .",
    "format:check": "prettier --check .",
    "install:all": "npm install --prefix frontend && npm install --prefix backend"
  },
  "devDependencies": {
    "concurrently": "^9.0.0",
    "prettier": "^3.3.0"
  }
}
```
Root has no application dependencies — only orchestration. `npm run dev` at the repo root boots both servers together with labeled, colored output.

### `backend/package.json` — dependencies

| Package | Purpose |
|---|---|
| `express` | HTTP framework (v5 — current stable) |
| `cors`, `helmet`, `compression`, `morgan` | CORS, security headers, gzip, request logging |
| `dotenv` | Load `.env` in development |
| `zod` | Request validation (doc 13) |
| `jsonwebtoken` | JWT sign/verify |
| `bcrypt` | Password hashing |
| `pg` | PostgreSQL driver (used directly where Prisma is overkill) |
| `prisma` / `@prisma/client` | ORM (doc 04) |
| `@aws-sdk/client-s3` | Cloudflare R2 (S3-compatible API) |
| `multer` | Multipart file upload handling |
| `isomorphic-dompurify` | XSS sanitization (doc 13) |
| `express-rate-limit` | Rate limiting (doc 13) |
| `meilisearch` | MeiliSearch client |
| `resend` | Transactional email |

**Dev dependencies:** `typescript`, `tsx` (fast TS execution + watch mode, replaces `ts-node`/`nodemon` combo), `@types/node`, `@types/express`, `@types/cors`, `@types/jsonwebtoken`, `@types/bcrypt`, `@types/multer`, `eslint`, `@eslint/js`, `typescript-eslint`, `eslint-config-prettier`, `jest`, `ts-jest`, `@types/jest`, `supertest`, `@types/supertest`.

### `backend/package.json` — scripts

```json
{
  "dev": "tsx watch server.ts",
  "build": "tsc -p tsconfig.json",
  "start": "node dist/server.js",
  "lint": "eslint .",
  "lint:fix": "eslint . --fix",
  "typecheck": "tsc --noEmit",
  "test": "jest",
  "test:watch": "jest --watch",
  "prisma:generate": "prisma generate",
  "prisma:migrate": "prisma migrate dev",
  "prisma:studio": "prisma studio",
  "db:seed": "tsx scripts/seed.ts",
  "search:sync": "tsx scripts/syncSearch.ts"
}
```

### `frontend/package.json` — additional dependencies (beyond what `create-next-app` installs)

From doc 12: `zustand`, `@tanstack/react-query`, `react-hook-form`, `zod`, `@hookform/resolvers`, `lucide-react`, `date-fns`, `axios`, `@tiptap/react` + `@tiptap/starter-kit`, `next-intl`.

**Dev dependencies (additional):** `eslint-config-prettier`, `jest`, `jest-environment-jsdom`, `@testing-library/react`, `@testing-library/jest-dom`, `@playwright/test`.

### `frontend/package.json` — scripts

```json
{
  "dev": "next dev --turbopack",
  "build": "next build",
  "start": "next start",
  "lint": "next lint",
  "typecheck": "tsc --noEmit",
  "test": "jest",
  "test:e2e": "playwright test"
}
```

---

## 8. Terminal Commands (exact order)

These assume the current state: repo already git-initialized at `d:\MoynullHasan\personal\bangladeshAIHub`, `project-planning/` already committed, root `.gitignore` already present. Run from the repo root in PowerShell.

```powershell
# 0. Confirm Node/npm versions match .nvmrc before anything else
node -v
npm -v

# 1. Create the two app folders
New-Item -ItemType Directory -Path frontend, backend

# 2. Scaffold the Next.js 15 / React 19 frontend (non-interactive)
npx create-next-app@latest frontend `
  --typescript --tailwind --eslint --app --src-dir `
  --import-alias "@/*" --turbopack --use-npm

# 3. Add frontend runtime dependencies
cd frontend
npm install zustand @tanstack/react-query react-hook-form zod @hookform/resolvers `
  lucide-react date-fns axios @tiptap/react @tiptap/starter-kit next-intl
npm install -D eslint-config-prettier jest jest-environment-jsdom `
  @testing-library/react @testing-library/jest-dom @playwright/test
cd ..

# 4. Initialize the backend
cd backend
npm init -y
npm install express cors helmet compression morgan dotenv zod jsonwebtoken bcrypt pg `
  prisma @prisma/client @aws-sdk/client-s3 multer isomorphic-dompurify `
  express-rate-limit meilisearch resend
npm install -D typescript tsx @types/node @types/express @types/cors `
  @types/jsonwebtoken @types/bcrypt @types/multer eslint @eslint/js `
  typescript-eslint eslint-config-prettier jest ts-jest @types/jest supertest @types/supertest
npx tsc --init
npx prisma init --datasource-provider postgresql
cd ..

# 5. Root orchestration tooling
npm init -y
npm install -D concurrently prettier
# then hand-edit root package.json to match the "name"/"scripts"/"engines" block in Part 7

# 6. Create the remaining root config files by hand (content given in Part 5):
#    .editorconfig, .nvmrc, .npmrc, .prettierrc.json, .prettierignore,
#    .vscode/settings.json, .vscode/extensions.json, README.md
#    Also apply the two .gitignore edits from Part 4.

# 7. Backend: create .env from the doc 13 template, fill in real Supabase/R2/JWT values
#    Frontend: create .env.local from the doc 12 template
#    (Both files are already covered by .gitignore — verify with `git status` before continuing)

# 8. Verify everything builds and lints clean
npm run install:all
npm run lint
npm run typecheck
npm run dev        # both servers should boot; Ctrl+C to stop

# 9. Stage and commit (review `git status` output first — never blind `git add .`)
git add frontend backend .github .vscode .editorconfig .npmrc .nvmrc `
  .prettierrc.json .prettierignore README.md package.json package-lock.json .gitignore
git commit -m "chore: scaffold frontend and backend project structure"
```

---

## Final Checklist

- [ ] `frontend/` and `backend/` exist with independent `package.json` files (no npm workspaces)
- [ ] Root `.gitignore` updated: `.vscode/*` with the two file exceptions, plus `*.tsbuildinfo`, `coverage/`, `.vercel/`
- [ ] `.env` (backend) and `.env.local` (frontend) exist locally, are **not** tracked by git, and `.env.example` for each **is** tracked
- [ ] `.nvmrc` present; `node -v` matches it
- [ ] `.npmrc` with `engine-strict=true` present; each `package.json` has an `engines` field
- [ ] Prettier config at root; `npm run format:check` passes in both apps
- [ ] ESLint flat config in both apps; `npm run lint` passes in both apps
- [ ] TypeScript strict mode on in both `tsconfig.json` files; `npm run typecheck` passes in both apps
- [ ] `.vscode/settings.json` + `.vscode/extensions.json` committed
- [ ] `npm run dev` at root boots both frontend (`:3000`) and backend (`:PORT` from `.env`) together
- [ ] `prisma init` completed; `DATABASE_URL` points at the Supabase Postgres instance from doc 04 (Supabase used **only** as Postgres — no Supabase Auth/Storage/Edge Functions)
- [ ] MeiliSearch reachable at the configured host (local instance for dev, per doc 04)
- [ ] Root README explains the monorepo layout and links back to `project-planning/00-master-index.md`
- [ ] `git status` reviewed before the first commit — confirm no `.env`/secret file is staged
- [ ] No Docker files present (explicitly out of scope for this stack)
- [ ] Initial scaffold commit made; ready to start Phase 1 MVP features (per doc 03) once this checklist is clean

---

*Document 15 of 15 — Bangla AI Hub Project Planning*
*This document specifies the scaffold; it does not create it. Execution happens in a follow-up step once this is approved.*
