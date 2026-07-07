# Bangla AI Hub — Development Standards
**Document:** 14  
**Version:** 1.0  
**Status:** Foundation Draft  
**Date:** July 2026

---

## Purpose

This document defines the rules every developer (including future contributors) must follow when working on Bangla AI Hub. Consistency saves time. These standards exist so code can be read, reviewed, and maintained without context-switching overhead.

---

## Project Folder Structure

### Backend (Node.js + Express.js)

```
banglaai-backend/
├── src/
│   ├── config/
│   │   ├── database.js         ← PostgreSQL pool connection
│   │   ├── cors.js             ← CORS allowed origins
│   │   ├── redis.js            ← Redis client (rate limiting)
│   │   └── r2.js               ← Cloudflare R2 S3 client
│   │
│   ├── middleware/
│   │   ├── authenticate.js     ← JWT verification
│   │   ├── authorize.js        ← RBAC permission check
│   │   ├── rateLimiter.js      ← express-rate-limit configs
│   │   ├── validate.js         ← Zod validation middleware
│   │   ├── upload.js           ← Multer file handling
│   │   └── requestLogger.js    ← Request/response logging
│   │
│   ├── routes/
│   │   ├── index.js            ← Router aggregator
│   │   ├── auth.routes.js
│   │   ├── resources.routes.js
│   │   ├── users.routes.js
│   │   ├── search.routes.js
│   │   ├── comments.routes.js
│   │   ├── notifications.routes.js
│   │   ├── contributor-applications.routes.js
│   │   └── admin.routes.js
│   │
│   ├── controllers/
│   │   ├── auth.controller.js
│   │   ├── resources.controller.js
│   │   ├── users.controller.js
│   │   ├── search.controller.js
│   │   ├── comments.controller.js
│   │   ├── notifications.controller.js
│   │   ├── contributor-application.controller.js
│   │   └── admin.controller.js
│   │
│   ├── services/               ← Business logic layer
│   │   ├── auth.service.js
│   │   ├── resources.service.js
│   │   ├── users.service.js
│   │   ├── search.service.js   ← MeiliSearch integration
│   │   ├── email.service.js    ← Email sending
│   │   ├── storage.service.js  ← Cloudflare R2 uploads
│   │   ├── notification.service.js
│   │   ├── reputation.service.js
│   │   └── contributor-application.service.js
│   │
│   ├── validators/             ← Zod schemas
│   │   ├── auth.validator.js
│   │   ├── resource.validator.js
│   │   ├── user.validator.js
│   │   └── contributor-application.validator.js
│   │
│   ├── utils/
│   │   ├── slugify.js          ← Unique slug generation
│   │   ├── jwt.js              ← Token sign/verify helpers
│   │   ├── hash.js             ← bcrypt + SHA-256 helpers
│   │   ├── pagination.js       ← Cursor/offset pagination helper
│   │   ├── auditLog.js         ← Audit log writer
│   │   └── apiResponse.js      ← Standard success/error response
│   │
│   ├── emails/                 ← Email templates (plain HTML or MJML)
│   │   ├── verifyEmail.html
│   │   ├── passwordReset.html
│   │   ├── submissionApproved.html
│   │   ├── submissionRejected.html
│   │   ├── commentReply.html
│   │   ├── weeklyDigest.html
│   │   ├── contributorApplicationApproved.html
│   │   ├── contributorApplicationRejected.html
│   │   └── contributorApplicationNeedsRevision.html
│   │
│   └── app.js                  ← Express app setup (middleware stack)
│
├── migrations/                 ← SQL migration files (numbered)
│   ├── 001_create_users.sql
│   ├── 002_create_roles_permissions.sql
│   └── ...
│
├── scripts/
│   ├── backup.sh               ← Weekly DB backup to R2
│   ├── seed.js                 ← Development seed data
│   └── syncSearch.js           ← Sync DB to MeiliSearch
│
├── tests/
│   ├── unit/
│   │   └── services/
│   └── integration/
│       └── routes/
│
├── .env                        ← NEVER commit — git-ignored
├── .env.example                ← Template with dummy values — commit this
├── .gitignore
├── package.json
└── server.js                   ← Entry point (starts Express)
```

---

## Naming Conventions

### Files

| Type | Convention | Example |
|------|-----------|---------|
| Route file | `kebab-case.routes.js` | `resources.routes.js` |
| Controller | `kebab-case.controller.js` | `auth.controller.js` |
| Service | `kebab-case.service.js` | `email.service.js` |
| Validator | `kebab-case.validator.js` | `resource.validator.js` |
| Middleware | `camelCase.js` | `authenticate.js` |
| React component | `PascalCase.tsx` | `ResourceCard.tsx` |
| Custom hook | `use + camelCase.ts` | `useAuth.ts` |
| Zustand store | `camelCase + Store.ts` | `authStore.ts` |
| Utility | `camelCase.ts` | `slugify.ts` |
| Type definition | `camelCase.ts` | `resource.ts` |

### Database

| Type | Convention | Example |
|------|-----------|---------|
| Table name | `snake_case plural` | `resources`, `audit_logs` |
| Column name | `snake_case` | `author_id`, `created_at` |
| Index name | `idx_table_column` | `idx_resources_slug` |
| FK column | `referenced_table_id` | `resource_id`, `author_id` |

### JavaScript / TypeScript

| Type | Convention | Example |
|------|-----------|---------|
| Variable | `camelCase` | `accessToken`, `userId` |
| Function | `camelCase verb+noun` | `getResource()`, `createUser()` |
| Constant | `UPPER_SNAKE_CASE` | `MAX_FILE_SIZE`, `JWT_EXPIRY` |
| Class | `PascalCase` | `EmailService` |
| Interface | `PascalCase` | `ResourceFilters` |
| Enum | `PascalCase` | `ResourceType`, `UserStatus` |

### API Endpoints

| Rule | Example |
|------|---------|
| Plural nouns, not verbs | `/resources` not `/getResources` |
| Lowercase, hyphen-separated | `/admin/audit-logs` not `/admin/auditLogs` |
| Nested for ownership | `/resources/:slug/comments` |
| Actions as POST | `POST /resources/:slug/bookmark` |
| Version prefix always | `/api/v1/resources` |

---

## Git Workflow

### Branch Naming

```
Format: <type>/<short-description>

Types:
  feat/     → new feature
  fix/      → bug fix
  docs/     → documentation only
  refactor/ → code change without feature/fix
  test/     → tests only
  chore/    → config, dependencies, tooling

Examples:
  feat/resource-submission-form
  fix/token-refresh-loop
  docs/api-specification-update
  refactor/auth-service-split
```

### Commit Message Format

```
Format: <type>(<scope>): <short description>

Types:
  feat     → new feature
  fix      → bug fix
  docs     → documentation
  style    → formatting (no logic change)
  refactor → code restructure
  test     → add/update tests
  chore    → build, config, dependencies

Scope (optional): auth | resources | users | search | admin | db | email | ui

Examples:
  feat(auth): add Google OAuth login
  fix(resources): correct soft delete query
  docs(api): add refresh token endpoint docs
  refactor(email): extract email service from auth controller
  chore(deps): upgrade express to 4.19.2
```

### Branch Protection Rules

```
main branch:
  - Direct push: FORBIDDEN
  - Merge via: Pull Request only
  - Required: at least 1 review (when team grows)
  - Required: all tests pass (once CI is set up)

develop branch (optional future):
  - Used for integration before promoting to main
```

### Workflow (Solo Phase)

```
1. Create branch from main: git checkout -b feat/my-feature
2. Make changes (small, focused commits)
3. Push branch: git push origin feat/my-feature
4. Create PR on GitHub
5. Review own PR after a short break (fresh eyes)
6. Merge via GitHub UI (squash merge preferred)
7. Delete branch after merge
```

---

## Coding Guidelines

### General

```
- Functions: do ONE thing. If a function is > 40 lines, split it.
- No magic numbers: const FIFTEEN_MINUTES = 15 * 60 * 1000 (not 900000)
- No commented-out code: use git history for old code
- Error handling: never swallow errors silently
- Logging: log errors with context (user ID, resource ID, action)
```

### JavaScript / Node.js

```javascript
// ✅ Always use async/await (not .then().catch())
const user = await getUserById(userId)

// ✅ Explicit error handling
try {
  const result = await createResource(data)
  return res.status(201).json(success(result))
} catch (error) {
  logger.error('createResource failed', { userId, error: error.message })
  return res.status(500).json(serverError())
}

// ✅ Destructure where it reads better
const { title, description, type } = req.validatedBody

// ❌ No var — use const (preferred) or let
// ❌ No callback-style async
// ❌ No console.log in production code — use logger
```

### TypeScript (Frontend)

```typescript
// ✅ Explicit return types on functions
async function getDataset(slug: string): Promise<Dataset> { ... }

// ✅ Discriminated unions over booleans for state
type LoadState = 'idle' | 'loading' | 'success' | 'error'

// ✅ Zod schema → inferred TypeScript type
import { z } from 'zod'
const resourceSchema = z.object({ title: z.string(), type: z.enum([...]) })
type Resource = z.infer<typeof resourceSchema>

// ❌ No 'any' type — use 'unknown' and narrow it
// ❌ No non-null assertions (!.) unless absolutely certain
```

### SQL

```sql
-- ✅ Parameterized queries only
SELECT * FROM users WHERE email = $1

-- ✅ Explicit column list (never SELECT *)
SELECT id, username, display_name, reputation_score FROM users WHERE id = $1

-- ✅ Include soft delete filter
WHERE deleted_at IS NULL

-- ❌ No string concatenation in queries
-- ❌ No SELECT * (breaks when columns added)
```

---

## Email Events

These are the email notifications the system sends. Each maps to a template file in `src/emails/`.

| Event | Trigger | Template |
|-------|---------|---------|
| Email verification | User registers | `verifyEmail.html` |
| Password reset | User requests reset | `passwordReset.html` |
| Submission approved | Admin approves resource | `submissionApproved.html` |
| Submission rejected | Admin rejects resource | `submissionRejected.html` |
| Comment reply | Someone replies to user's comment | `commentReply.html` |
| New follower | (Phase 2) | `newFollower.html` |
| Reputation milestone | User reaches 100, 500, 1000, 5000 points | `reputationMilestone.html` |
| Weekly digest | Every Monday 9:00 AM | `weeklyDigest.html` |
| Account suspended | Admin suspends account | `accountSuspended.html` |
| Report resolved | Report reporter got a decision | `reportResolved.html` |
| Contributor application approved | Editor+ approves a contributor application | `contributorApplicationApproved.html` |
| Contributor application rejected | Editor+ rejects a contributor application | `contributorApplicationRejected.html` |
| Contributor application needs revision | Editor+ requests changes to an application | `contributorApplicationNeedsRevision.html` |
| Contributor application submitted | Applicant submits (confirmation) | `contributorApplicationSubmitted.html` |
| Contributor application withdrawn | Applicant withdraws their own application | `contributorApplicationWithdrawn.html` |

### Email Service Pattern

```javascript
// services/email.service.js
import { Resend } from 'resend'
const resend = new Resend(process.env.EMAIL_API_KEY)

export async function sendSubmissionApproved({ userEmail, userName, resourceTitle, resourceSlug }) {
  return resend.emails.send({
    from: process.env.EMAIL_FROM,
    to: userEmail,
    subject: `Your submission "${resourceTitle}" has been approved!`,
    html: renderTemplate('submissionApproved', { userName, resourceTitle, resourceSlug }),
  })
}
```

---

## Reputation Formula Details

### Point Events

| Action | Points | Notes |
|--------|--------|-------|
| Dataset approved | +50 | One-time, per dataset |
| Research paper approved | +30 | One-time, per paper |
| Tutorial/tool approved | +20 | One-time |
| Prompt approved | +10 | One-time |
| Edit accepted by admin | +10 | Per accepted edit |
| Comment upvoted | +2 | Per upvote received |
| Submission rejected | -5 | Per rejection |
| Valid report filed against user | -10 | Per confirmed violation |
| Reporting spam (false report) | -5 | Discourage abuse |

### Reputation Tiers

| Tier | Min Score | Label | Badge Color |
|------|-----------|-------|-------------|
| Newcomer | 0 | Newcomer | Gray |
| Contributor | 50 | Contributor | Blue |
| Trusted | 200 | Trusted | Green |
| Expert | 500 | Expert | Purple |
| Champion | 1000 | Champion | Gold |
| Legend | 5000 | Legend | Red |

### Reputation Service Logic

```javascript
// services/reputation.service.js
export async function awardPoints(userId, eventType, resourceId = null) {
  const pointMap = {
    'dataset_approved': 50,
    'paper_approved': 30,
    'tutorial_approved': 20,
    'prompt_approved': 10,
    'edit_accepted': 10,
    'comment_upvoted': 2,
    'submission_rejected': -5,
    'report_validated_against': -10,
  }
  
  const points = pointMap[eventType]
  if (points === undefined) throw new Error(`Unknown event type: ${eventType}`)
  
  await pool.query(
    'INSERT INTO reputation_events (user_id, event_type, points, resource_id) VALUES ($1, $2, $3, $4)',
    [userId, eventType, points, resourceId]
  )
  
  await pool.query(
    'UPDATE users SET reputation_score = reputation_score + $1 WHERE id = $2',
    [points, userId]
  )
  
  // Check for milestone notifications
  await checkReputationMilestone(userId)
}
```

---

## .env.example Template

```bash
# .env.example — copy to .env and fill in real values
# NEVER commit .env — only commit .env.example

# Database
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@YOUR_HOST:5432/postgres

# JWT
JWT_ACCESS_SECRET=replace_with_64_char_random_string
JWT_REFRESH_SECRET=replace_with_another_64_char_random_string

# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=http://localhost:5000/api/v1/auth/google/callback

# Cloudflare R2
R2_ACCOUNT_ID=your_account_id
R2_ACCESS_KEY_ID=your_access_key_id
R2_SECRET_ACCESS_KEY=your_secret_access_key
R2_BUCKET_NAME=banglaai-datasets

# MeiliSearch
MEILISEARCH_HOST=http://localhost:7700
MEILISEARCH_ADMIN_KEY=your_admin_key
MEILISEARCH_SEARCH_KEY=your_search_only_key

# Email (Resend)
EMAIL_API_KEY=re_your_api_key
EMAIL_FROM=noreply@banglaai.dev

# App
NODE_ENV=development
PORT=5000
FRONTEND_URL=http://localhost:3000
```

---

## Code Review Checklist

Before merging any PR, check:

### Logic
- [ ] Does the code do what it's supposed to do?
- [ ] Are edge cases handled (null, empty array, invalid input)?
- [ ] Are all error paths handled (try/catch where async)?

### Security
- [ ] No string concatenation in SQL queries
- [ ] User input is validated before use
- [ ] RBAC check present on protected endpoints
- [ ] No secrets hardcoded

### Standards
- [ ] Naming follows conventions
- [ ] No `console.log` statements
- [ ] No commented-out code
- [ ] Functions do one thing

### Database
- [ ] `deleted_at IS NULL` filter on soft-deleted tables
- [ ] Significant admin actions logged to `audit_logs`
- [ ] Reputation changes go through `reputation.service.js`

### Environment
- [ ] No new secrets added to code (only `.env`)
- [ ] `.env` changes documented in `.env.example`

---

*Document 14 of 15 — Bangla AI Hub Project Planning*
