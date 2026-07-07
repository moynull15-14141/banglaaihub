# Bangla AI Hub Audit Report
**Date:** 2026-07-07
**Scope:** Full documentation-vs-implementation audit, read-only.
**Method:** Every planning doc (00–15) read in full; entire `backend/` and `frontend/` source trees scanned file-by-file (routes, controllers, services, validators, middleware, Prisma schema, all pages/components/hooks); direct verification of specific claims (grep for call sites, not just file existence).

---

## Executive Summary

**Overall completion: ~40–45% of the full 5-year-roadmap Phase 1+2 scope; ~70% of the "MVP Phase 1 — Core Platform" checklist in doc 03.**

**Project health: Good bones, uneven finish.** The backend core (auth, RBAC, resources, categories/tags, search, admin CRUD) is genuinely solid — real Prisma queries, real R2 uploads, real MeiliSearch indexing, real audit logging, consistent DTO discipline (no leaked secrets anywhere checked). The frontend public-facing site (home, listings, detail pages, search, categories, profiles) is fully real and wired to those backend endpoints. But everything built **after** that — the interactive account features (submit, bookmarks, notifications, profile editing) and the entire admin *action* layer (approve/reject, ban/role-change, resolve reports) — is UI-stubbed ("Coming soon") even where the backend endpoint already exists and works. Three backend subsystems that read as "done" from the Prisma schema alone are actually inert: **reputation never gets awarded**, **notifications never get created** (only read), and **comments are a 100% stub** returning 501 on every route.

**Critical, non-negotiable item:** `backend/.env.example` (a file tracked in git) contains a `DATABASE_URL` line that does not look like a generic placeholder. I did not print it and was blocked by a safety check from attempting to. **Open that file yourself right now and confirm whether it's a real credential; if so, rotate it immediately and scrub git history.** This is flagged first because it's time-sensitive; everything else in this report can wait.

**The single biggest unknown:** nothing in this project has ever been verified against a live database. `DATABASE_URL` has been a placeholder (`YOUR_HOST`) through every phase — every "verification" in every prior phase report reached the DB layer and failed at the connection string, by design, because no live Supabase instance has ever been wired up. That means **zero end-to-end runtime verification exists anywhere** — not of a single query, a single upload, a single search result, a single real user record. Everything reported "working" below is working at the level of: compiles, type-checks, is wired to the right function, and reaches the DB call correctly. Real behavior with real data is unverified.

---

## Completed Features

- **JWT auth** — access (15min) + refresh (30d, rotated, replay-detected, hashed in DB) tokens. `backend/src/services/auth.service.ts`, `backend/src/utils/jwt.ts`.
- **Google OAuth** — full redirect → callback → account-link-or-create → token issue flow. `backend/src/controllers/auth.controller.ts` (`googleRedirect`/`googleCallback`), frontend `src/components/auth/AuthCallbackView.tsx`.
- **RBAC** — 8-tier cumulative role hierarchy, permission matrix, `authorize()` middleware enforced server-side on every protected route. `backend/scripts/seed.ts`, `backend/src/middleware/authorize.ts`.
- **Password security** — bcrypt cost 12, 5-password reuse history. `backend/src/utils/hash.ts`, `PasswordHistory` model.
- **Resources CRUD** — create/update/soft-delete/approve/reject/feature/restore, dataset+paper+tool type-specific metadata (paper/tool mapping added during this session's Phase 9 as a verified-bug fix), categories (hierarchical), tags. `backend/src/services/resources.service.ts`.
- **Users API** — own/public profile, avatar upload, bookmarks (backend), submissions list, admin user management (list/get/update/status/roles/delete). `backend/src/services/users.service.ts`.
- **Search** — MeiliSearch indexing, sync-on-write, filtered/sorted/paginated search endpoint. `backend/src/services/search.service.ts`.
- **Admin API** — user management, report resolution, audit-log listing, dashboard aggregation, resource moderation. `backend/src/services/admin.service.ts`, `report.service.ts`.
- **Cloudflare R2 storage** — dataset file upload, avatar upload, signed download URLs (real S3-compatible calls, not stubs). `backend/src/services/storage.service.ts`.
- **Audit logging** — 19+ distinct actions logged across resource/user/category/bookmark/admin mutations. `backend/src/utils/auditLog.ts`.
- **Frontend public site** — home, `/resources`, `/datasets`, `/papers`, `/tools` (+ `[slug]` detail pages), `/search`, `/categories/[slug]`, `/users/[username]`, `/about` — all real, React-Query-driven, SEO metadata + sitemap/robots.
- **Frontend auth pages** — Google-OAuth-only login/register/callback flow, session-expired dialog, silent-refresh session restore on reload.
- **Admin dashboard overview (read-only)** — real stats, resource status/type breakdowns, pending-resources widget, recent-users widget, activity feed — all backed by real queries.
- **Theme system** — working light/dark/system toggle (`next-themes`), in Settings → Appearance.
- **Security headers/CORS** — Helmet CSP, HSTS, CORS allowlist verified working end-to-end against `localhost:3000` in this session.

---

## Partially Completed Features

- **Authentication (frontend/backend parity)** — Backend fully supports email+password (register/login/forgot-password/reset-password all real) *and* Google OAuth. Frontend now exposes **only** Google — the email/password UI was removed, but the underlying `login()` call, `LoginCredentials` type, and store action are still present and dead (unused by any component). Result: a fully-built backend auth path (email/password) has no UI, and doc 03's MVP Phase 1 checklist item "email + Google login" is only half user-reachable.
- **Notifications** — read endpoints (`list`/`markRead`/`markAllRead`) are genuinely wired to Postgres. But **nothing in the entire codebase ever calls `prisma.notification.create`** — resource approval/rejection, comment replies, reputation milestones: none of them produce a notification. The feature is a working read API over a table that the running app can never populate. Frontend `/notifications` page is a "Coming soon" stub on top of that.
- **Reputation system** — `ReputationEvent`/`User.reputationScore` schema exists, and a read-only summary endpoint works (`GET /users/:username/reputation`). But `ReputationService` has **no write method at all** — no `awardPoints`, no call from resource-approval, comment-upvote, or report-validation flows. Every user's reputation score will read 0 forever under real usage. Doc 14's entire point-value table (dataset approved +50, etc.) is unimplemented.
- **Rate limiting** — 4 of doc 13's 9 rules are wired exactly as specified (login, register, forgot-password, refresh). Resource submission (10/hr), report filing (20/day), search (60/min), and admin actions (30/min/user) fall through to only the blanket 300/min global limiter — not the documented per-route/per-user limits. Also: in-memory store only, no Redis (consistent with doc 04's "Redis is Phase 2" note, so this part is expected, not a bug).
- **Email system** — real Resend integration (not a stub), but only 2 of doc 14's 10 documented email events are implemented (verification, password reset). Missing: submission approved/rejected, comment reply, reputation milestone, weekly digest, account suspended, report resolved. No corresponding `.html` templates exist for the missing 8 either.
- **Dashboard (user)** — overview page is real (live stats via `GET /users/me/dashboard`). Submit, Bookmarks, Notifications, My Submissions, and Settings→Profile are all `ComingSoonPage` placeholders with zero data fetching. Settings page itself is a mix: Appearance and Security(logout) tabs are real; Profile/Notifications/Google Account/About tabs are static.
- **Admin panel (action layer)** — Dashboard overview is real and read-only. `/admin/pending`, `/admin/users`, `/admin/reports` are all `ComingSoonPage` stubs. **The backend already supports** resource approve/reject/feature/unfeature, user status/role change/delete, and report resolve/reject — none of it has a mutation wired up in the frontend (`src/lib/api/admin.ts` is 100% read-only, zero `useMutation` usage anywhere in the codebase). This is the largest gap between "backend capability" and "frontend usability" in the project.
- **Bookmarks** — backend fully functional (`POST/DELETE /resources/:slug/bookmark`, `GET /users/me/bookmarks`). Frontend shows a disabled Bookmark button ("coming soon") on the resource detail page and a stub `/bookmarks` page — the count displays, but nobody can actually bookmark anything through the UI.
- **Comments** — Prisma `Comment` model is fully fleshed out (threading, upvotes, moderation status) and all 5 REST routes from doc 11 are correctly mounted with the right auth guards — but every handler is a literal one-line `sendNotImplemented()` (HTTP 501). Zero database logic. No frontend UI at all (repo-wide search for "comment" returns nothing in `frontend/src`).
- **Resource submission** — the backend `POST /resources` (+ dataset file upload) is fully built and works; the frontend `/submit` page is a stub with no form. There is currently no way for a real end user to submit a resource through the UI.

---

## Missing Features

- **Discussion/Forum system** (doc 03 MVP Phase 2, doc 02 Module 2, doc 06) — no `Discussion` model, no forum routes, no forum UI. Correctly absent per roadmap (Phase 2 is Q3 2026, just starting).
- **Research paper submission/moderation workflow** as a distinct flow (doc 03 MVP Phase 3, Q3 2026 second half) — papers exist as a `Resource` subtype with full metadata, but no dedicated curation/moderation workflow beyond the generic resource-approval path. Expected-absent per roadmap.
- **Bangladesh AI Index** (doc 03 MVP Phase 4, doc 02 Module 3) — no models, routes, or pages. Expected-absent per roadmap (Q4 2026).
- **Learning Center** (doc 03 MVP Phase 5, doc 02 Module 4) — nothing exists. Explicitly deferred to 2027 by the roadmap itself — correctly absent.
- **Creator marketplace / paid tiers / API access tiers / institutional licensing** (doc 05) — nothing exists. Explicitly Year 2/3+ scope — correctly absent.
- **GitHub OAuth** — doc 02's "Auth = Email + Google + GitHub" is not matched; only Google OAuth exists in the backend. No GitHub strategy anywhere.
- **Quality-tier / quality-score system** (doc 08's Community Submitted/Verified/Certified tiers; doc 04's `qualityScore` field) — no such field exists anywhere in `schema.prisma`. Only the generic `pending/approved/rejected/flagged` status exists.
- **Dataset submission minimum-requirement enforcement** (doc 08: 200-word description minimum, 100-example sample minimum) — `createResourceSchema` enforces `description.min(50)` (characters, not words) and has no sample-file-count concept at all. Not enforced as doc 08 specifies.
- **Testing** — zero test files exist anywhere in the repo (`frontend/` and `backend/` both). `backend/tests/` directory doesn't exist despite being in doc 14's locked folder structure and referenced by `package.json`'s `"test": "jest"` script. No CI/GitHub Actions workflow files found in `.github/` beyond what doc 15 specified (not independently confirmed present — see Code Quality section).
- **Deployment** — no evidence of an actual Vercel/Render deployment; this is Phase 14, correctly not started.
- **Weekly digest, reputation milestone, account-suspended, report-resolved, submission-approved/rejected email templates** — 5 of 10 email events, no `.html` template files exist for these.
- **Semantic search, Redis caching, pgvector** — all explicitly Phase-2+/Year-2 per doc 04; correctly absent.

---

## Documentation Mismatches

1. **Doc 02 says "Auth: Email + Google + GitHub OAuth."** Reality: backend has email+Google (no GitHub); frontend UI now exposes Google only. Three-way mismatch — doc overstates (GitHub), and frontend understates relative to its own backend (email/password exists server-side but has no UI).
2. **Doc 02 says "API: REST + GraphQL."** No GraphQL exists anywhere (`backend/package.json` has no `graphql`/`apollo` dependency). Every other doc (00, 04, 11) describes REST-only — doc 02 appears to be the outlier/inconsistent one.
3. **`.env.example` (backend) is missing `R2_ACCOUNT_ID`/`R2_ACCESS_KEY_ID`/`R2_SECRET_ACCESS_KEY`/`R2_BUCKET_NAME`** even though doc 13 and doc 14 both include these in their `.env.example` templates, and `backend/src/config/r2.ts` genuinely reads them. Code works fine (vars are optional with graceful degradation), but the template a new developer would copy is incomplete.
4. **README.md says "Auth: Custom JWT (access + refresh tokens)"** with no mention of Google OAuth at all, even though OAuth is a fully-built, first-class auth path. README understates actual capability (opposite direction from finding #1).
5. **Doc 03's MVP Phase 1 checklist says "User authentication (email + Google login)"** as a completed-checklist item — technically backend-true, frontend-false (see Partially Completed above).
6. **Doc 11's Comments API is fully specified** (5 endpoints, request/response shapes) with zero indication it's unimplemented — a developer reading only doc 11 would reasonably assume comments work.
7. **Doc 14's Reputation Point Events table and Email Events table** are both presented as settled specs with no "not yet implemented" caveat, but both are largely (reputation: 100%; email: 80%) unimplemented.
8. **Doc 08's dataset quality-tier system and minimum-requirement rules** are documented as concrete, specific numbers (200 words, 100 examples, 2-reviewer verification) with no corresponding schema field or validation — currently a paper policy with no code enforcement at all, not even partial.
9. **Doc 00's document-status table marks docs 01–14 "✅ Complete"** — that's about the *documentation*, not the implementation, and is accurate as a documentation-completeness claim; flagging only so it isn't misread as an implementation-completeness claim.

---

## Backend Status

Solid. Express 5 + TypeScript, Prisma 7 (`@prisma/adapter-pg`), consistent DTO-mapping discipline (every service builds explicit-allowlist DTOs — I checked `toResourceDto`, `toAdminUserDto`, `getPublicProfile`, `getOwnProfile` and none leak password hashes, refresh tokens, or OAuth IDs). Middleware stack order (`app.ts`) is sound: trust proxy → requestId → helmet → cors → compression → body/cookie parsing → global rate limiter → request logging → routes → 404 → error handler. 23 Prisma models, 2 migrations (`20260706120000_init`, `20260706130000_add_password_history`). Weak spots: comments (stub), reputation (dead write-side), notifications (dead write-side), rate limiting (partial), email (2/10 events).

## Frontend Status

Next.js 15 App Router, React 19, TypeScript, Tailwind v4 + shadcn/ui, Zustand + React Query, axios with refresh-on-401 interceptor (access token in-memory only — verified still true after later changes). Public site (Phase 9 scope) is complete and real. Auth pages are complete for the Google-only path they now implement, but carry dead email/password plumbing. Dashboard and Admin panel are both "shell + real overview, stub everything actionable" — consistent pattern across both areas, suggesting this was a deliberate scaffolding pass (build every route/layout/nav first) rather than an oversight, but it means no authenticated user can currently *do* anything (submit, bookmark, comment, edit profile) and no admin can currently *act* on anything (approve, ban, resolve) through the UI.

## Database Status

Schema is comprehensive and well-normalized (23 models covering every doc-10 entity plus `PasswordHistory` added mid-project). **Never connected to a live database** — `DATABASE_URL` remains a placeholder throughout the project's history per every prior phase's own verification notes. Migrations exist and look structurally sound but have never been applied to or verified against a real Postgres instance.

## Admin Panel Status

Dashboard overview: real, functional, read-only. Pending-approvals, user-management, and reports pages: all `ComingSoonPage` stubs. No mutation capability exists anywhere in the frontend admin surface despite the backend fully supporting resource approve/reject/feature, user status/role/delete, and report resolve/reject. This is the single largest "backend ready, frontend not wired" gap in the project.

## Authentication Status

Backend: complete and well-verified (JWT, refresh rotation + replay detection, bcrypt, Google OAuth, RBAC). Frontend: complete for its current Google-only scope, with good UX polish (silent session restore, session-expired dialog) that goes beyond what any doc specified — a genuine positive beyond spec. Gap: no user-facing path to the backend's email/password auth.

## Search Status

Complete. MeiliSearch config/index/sync/search all real (backend), search page fully wired with debounce/filters/sort/pagination (frontend). Only gap: the search-specific 60/min rate limit isn't wired (falls under the blanket global limiter instead).

## Upload System Status

Backend complete and real (R2 dataset + avatar upload, signed URLs, checksum). No frontend entry point yet — `/submit` (dataset upload) and profile-picture upload (via Settings/Profile, both stubs) have no UI to trigger the working backend flow.

## Email System Status

Real Resend integration, not a stub — but only handles account lifecycle (verify, reset). None of the 8 event-driven emails (approvals, comments, milestones, digests, suspensions, report outcomes) exist.

## UI/UX Status

Consistent shadcn/ui-based design system throughout, responsive, dark/light theme working. Loading/error/empty states handled consistently via shared components (`LoadingSkeleton`, `ErrorState`, `EmptyState`, `ComingSoonPage`). Status pages (401/403/404/500) are real and well-built. Terms/Privacy pages explicitly self-label as placeholder legal text (honest, not silently fake). Support page is real and product-specific.

## Security Review

- Access token in-memory only, refresh token httpOnly cookie — correct, verified.
- CORS allowlist verified working end-to-end (tested in this project's own Phase 9 session).
- Helmet CSP/HSTS present and reasonably strict.
- RBAC enforced server-side (not just UI-gated) — verified via code reading, `authorize()` middleware present on every privileged route checked.
- **`isomorphic-dompurify` is installed but never imported/used anywhere in `backend/src`.** Doc 13's XSS-prevention example (sanitize user-submitted descriptions before storing) was never implemented. Current risk is likely low in practice since the frontend renders resource descriptions as plain text (not `dangerouslySetInnerHTML`), but this is a real gap versus the documented defense-in-depth control, and would become a live risk the moment any rich-text/HTML rendering is introduced (e.g., a future Tiptap-based description editor, since `@tiptap/react` is already a dependency).
- **Potential committed database credential in `backend/.env.example`** (tracked in git) — flagged above, needs immediate manual verification and rotation if real. This is the top-priority item in this entire report.
- Rate limiting gaps (see Partially Completed) reduce brute-force/abuse protection on resource submission, reporting, search, and admin endpoints to the generic 300/min blanket only.
- No Redis-backed rate-limit store — acceptable for current single-instance Phase 1 scale per doc 04, but would silently under-protect if deployed across multiple instances.

## Code Quality Review

Consistent, disciplined patterns throughout what I read: explicit-allowlist DTOs, shared `resourceInclude`/`toResourceDto` reused across services rather than duplicated, `writeAuditLog` used consistently, Zod validation on all mutating endpoints, TypeScript strict mode. No `console.log` found in the backend code I reviewed. The frontend's dead email/password auth plumbing (`login()` in `authStore.ts`/`lib/api/auth.ts`) is the one clear piece of dead code identified — small, low-risk, but worth a cleanup pass or an explicit decision to re-expose it.

## Technical Debt

- Dead email/password login code path in the frontend (store action + API function + type, zero callers).
- `isomorphic-dompurify` dependency installed, unused.
- Backend `.gitignore` is minimal (`node_modules`, `.env`, `/src/generated/prisma` only) — no `dist/`, `coverage/`, `*.tsbuildinfo` entries, relying entirely on the root `.gitignore` to cover those; fine as long as backend is never built/tested standalone from its own directory with a differently-scoped git tool.
- `backend/.env.example` missing R2 variable names (functional no-op, documentation gap).
- No test infrastructure exists despite `jest`/`supertest`/`@playwright/test` all being installed as dependencies in both apps — tooling is present, zero tests written.

## Bugs Found

None found that affect currently-reachable functionality beyond what's already listed as "Partially Completed" (those are scope gaps, not bugs — the implemented parts of each feature behave correctly wherever I could trace the logic). No dead-code paths were found to be *reachable* in a way that would cause a runtime error (the unused `login()` function is simply never called, not broken). I did not find any leaked secrets in application responses (checked every DTO mapper touched by an authenticated or public endpoint).

## High Priority Tasks

Ranked highest to lowest:

1. **Verify and rotate the `backend/.env.example` `DATABASE_URL`** if it's a real credential — do this before anything else, independent of the rest of this list.
2. **Connect a real Supabase database and run the migrations** — nothing else can be truly verified until this exists; this unblocks real testing of every other item.
3. **Wire the admin action layer** (approve/reject resources, user status/role/delete, resolve/reject reports) into `/admin/pending`, `/admin/users`, `/admin/reports` — the backend is ready; this is the highest-leverage frontend gap since it blocks any real content moderation.
4. **Wire up notification creation** on resource approval/rejection at minimum (the two events with an already-built email counterpart) — otherwise the notification system remains permanently empty in production.
5. **Wire up reputation awarding** on resource approval (dataset/paper/tool/prompt point values per doc 14) — otherwise reputation scores are permanently 0 and the "Champion"/"Legend" tier UI (already built on the frontend!) will never trigger for anyone.
6. **Build the resource-submission form** (`/submit`) — without it, there is no way for a real user to create content, making the whole platform read-only in practice.
7. **Decide and resolve the email/password vs Google-only auth question** — either finish removing the dead backend/store plumbing, or restore a password-based UI path, so doc 02/03 and the actual product agree.
8. **Complete the remaining rate limits** (resource submit, report, search, admin) per doc 13's table.
9. **Implement Comments** (or explicitly descope it from doc 11/03 if it's been deprioritized) — currently a fully-routed, fully-modeled, zero-logic feature.
10. **Build Bookmarks and Notifications frontend pages** against their already-real backend endpoints.

## Recommended Development Order

1. Fix/verify the `.env.example` credential concern (5 minutes, but must happen first).
2. Stand up a real Supabase Postgres instance, run migrations, seed RBAC data — unlocks real end-to-end testing for literally everything else.
3. Admin action layer (approve/reject/ban/role-change/report-resolve UI) — highest leverage, backend-ready.
4. Reputation-awarding wire-up (small, isolated change, immediately makes the existing reputation-tier UI meaningful).
5. Notification-creation wire-up on the same approval/rejection events (natural pairing with #4, and #3's flows are the trigger points).
6. Resource submission form (`/submit`) — the platform's core "create" action.
7. Bookmarks + Notifications frontend pages (backend already supports both; straightforward React-Query wiring, same pattern already used for the public pages).
8. Decide the auth-method scope question and clean up accordingly.
9. Complete the remaining rate limits (mechanical, follows the existing `createRateLimiter` pattern already used for auth routes).
10. Comments system (new model logic + frontend UI) — larger effort, sequence after the above since it's a net-new feature rather than wiring up something already built.
11. Testing infrastructure — once real DB access exists (#2), write integration tests against the now-verifiable flows rather than before.
12. Everything under doc 03's MVP Phase 3+ (paper moderation workflow, Bangladesh AI Index, Learning Center) — correctly sequenced after Phase 1/2 completion, per the roadmap's own ordering.

---

*This report is a point-in-time snapshot generated 2026-07-07. It does not modify any code, configuration, or documentation file other than itself.*
