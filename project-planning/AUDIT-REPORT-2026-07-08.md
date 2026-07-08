# Bangla AI Hub — Complete Project Audit
**Date:** 2026-07-08
**Scope:** Full backend-to-frontend, database, and infrastructure audit. Read-only — no files modified.
**Method:** 8 parallel code-reading research passes (docs, auth/security, resource/storage, contributor/admin, notifications/reputation/email/analytics, search/categories/bookmarks/comments, frontend architecture, performance/infra/testing) — every finding traced to a file and line, not inferred from documentation. Cross-checked against the prior baseline audit, `AUDIT-REPORT-2026-07-07.md`, one day earlier in this same repo.

---

## 1. Executive Summary

The project has moved a long way in a short time. The 2026-07-07 audit put overall completion at roughly 40–45% of the Phase 1+2 roadmap scope, with the entire admin action layer, contributor system, notifications, and reputation all either UI-stubbed or write-dead. As of this pass — one day later — **overall completion is ~76%** of that same scope. The contributor application system, the admin moderation/user-management panel, notification creation, reputation awarding, five new transactional emails, and a full multi-file resource-attachment system ("Phase 2.3") all shipped in the interim, and all of it verified as genuinely working, not scaffolded.

What's left is now concentrated rather than spread thin. Four frontend pages remain literal placeholders (Bookmarks, Notifications, Settings→Profile edit, Admin→Reports) despite every one of them having a fully working backend already sitting behind the stub — this is the single most repeated pattern in the codebase: build the backend correctly, then run out of runway before wiring the last screen. Comments remain a complete no-op at both layers (correctly, per the roadmap — Phase 2 community features are only just now coming into scope, Q3 2026). Infrastructure — tests, CI, deployment config, monitoring — is close to zero, the largest single gap in the entire audit and the one most likely to bite in production.

Two new, real bugs were found this pass that did not exist in, or were not caught by, the prior audit: a signed-URL resend bug on paper PDFs that silently corrupts the permanent file link within an hour of any edit (the same bug class was already fixed for thumbnails but missed for papers), and a stored-XSS vector via unescaped user content injected into a JSON-LD `<script>` tag on every public resource page. A third finding — a Google OAuth flow with no CSRF `state` parameter — is a new security gap, not a regression. The DATABASE_URL-shaped credential flagged in `backend/.env.example` by the prior audit is still there, still unrotated.

**Headline:** the engineering discipline is real — consistent DTO allow-lists, a single shared upload pipeline for every file kind, permission-set-based (not role-string) authorization, safe migration history with proper backfills, and no SQL-injection surface anywhere. This is not a project papering over shortcuts; it is a project genuinely further along on quality than on breadth.

---

## 2. Overall Completion

Measured against the combined "MVP Phase 1 — Core Platform" + "MVP Phase 2 — Community" scope in `project-planning/03-5-year-roadmap.md` (Phase 2 is now inside its own Q3 2026 window, so it's fairly included rather than excluded as "not yet due").

| Snapshot | 2026-07-07 | 2026-07-08 (this audit) | Delta |
|---|---|---|---|
| Overall (Phase 1+2 scope) | ~40–45% | **~76%** | +31–36 pts |
| Contributor system | 0% (didn't exist) | 97% | built from scratch |
| Admin action layer | ~5% (read-only shell) | 82% | +77 pts |
| Notifications (write path) | 0% | 55% | +55 pts |
| Reputation (write path) | 0% | 28% | +28 pts |
| Email events | 20% (2/10) | ~58% | +9 events shipped |
| Bookmarks (frontend) | 0% | 0% | unchanged |
| Comments | 0% | 0% | unchanged |
| Infra / testing | ~5% | 12% | contributor-app rate limit only |

---

## 3. Phase Completion

| System | Completion |
|---|---|
| Authentication | 92% |
| RBAC | 95% |
| Contributor System | 97% |
| Resource System | 90% |
| Storage / Upload (R2) | 92% |
| Admin Panel | 82% |
| Moderation | 78% |
| Notifications | 55% |
| Email | 58% |
| Reputation | 28% |
| Analytics | 68% |
| Search | 98% |
| Categories | 85% |
| Bookmarks | 50% |
| Comments | 0% |
| Profile & Settings | 52% |
| **Frontend (overall)** | **88%** |
| **Backend (overall)** | **86%** |
| **Database** | **87%** |
| **Infrastructure / Deployment** | **12%** |
| **Overall Product** | **76%** |

---

## 4. Backend Completion — 86%

Express 5 + TypeScript, Prisma 7 (`@prisma/adapter-pg`), consistent explicit-allowlist DTO mapping throughout (spot-checked `toResourceDto`, admin/user DTOs — no leaked hashes, tokens, or OAuth IDs found). Middleware order in `app.ts` is sound. 23 Prisma models, 7 migrations, all structurally safe.

**Strong:** auth, RBAC, resources CRUD (all 7 types), storage/upload pipeline, contributor application service, admin service, search sync, audit logging (27+ distinct logged actions).

**Weak:** comments controller is five one-line 501 stubs; reputation has a write path but only 2 of 9 documented trigger events; email has 9 of an effectively-15-event catalogue (10 original + 5 new); rate limiting covers 5 routes out of 9 route files, the rest fall through to a blanket 300/min-per-IP limiter; `Report`/`ResourceAnalytics`/`RefreshToken` tables carry real index gaps against their actual query patterns.

## 5. Frontend Completion — 88%

Next.js 15 App Router, React 19, TypeScript, Tailwind v4 + shadcn/ui (Radix primitives), Zustand + TanStack Query. Of every page in the app, only **four remain literal `ComingSoonPage` stubs**: `/bookmarks`, `/notifications`, `/settings/profile`, and `/admin/reports` — down from a much longer list in the prior audit (Submit, My Submissions, and the entire admin action layer were stubs then; all are real now).

Route/page parity is exact — every constant in `routes.ts` resolves to a real page file. SEO metadata covers 26/26 public pages, sitemap and robots.txt are dynamic and live. Accessibility is a genuine strength (inherited from Radix primitives, not manually reimplemented). Sidebars are correctly `sticky` (confirmed fixed in both dashboard and admin shells this session). Three small dead exports exist (`StatsCard.tsx`, `useApi.ts`, `useCurrentUser.ts`) — zero call sites, safe to delete.

## 6. Database Completion — 87%

23 models, 12 enums, 7 migrations applied in a safe, backfill-aware order — **no destructive operation found anywhere in the migration history** (the one populated-table `NOT NULL` addition was correctly done nullable-first → backfilled → constrained). `DATABASE_URL` now points at what reads as a genuine live Supabase pooler connection, a real change from the prior audit's placeholder finding.

Doc 10 (database design) matches the real schema field-for-field across all 22 originally-specified tables, including the newer `resource_files` table. Doc 04's own "Data Models" section, by contrast, is a stale early draft referencing fields and models (`qualityScore`, `titleBn`, `Discussion`, `Profile`, `ResourceVersion`) that were never built — doc 10 superseded it but doc 04 was never reconciled.

Index coverage is good where query patterns are hot (resources, users, contributor applications, notifications) but has real gaps: `Report` and `ResourceAnalytics` have **zero indexes** despite being actively filtered/queried, and `RefreshToken` has no index on `userId` and no pruning job.

## 7. Infrastructure Completion — 12%

The least-finished dimension of the whole project, unchanged in kind (though slightly improved in degree) since the prior audit.

| Area | Status | Evidence |
|---|---|---|
| Automated tests | 🔴 Not Implemented | Zero `*.test.ts`/`*.spec.ts` files in either app; jest/playwright/supertest installed but unconfigured (no config file at all) |
| CI/CD | 🔴 Not Implemented | No `.github/workflows/` directory exists |
| Deployment config | 🔴 Not Implemented | No Dockerfile, `vercel.json`, or `render.yaml` anywhere in the repo |
| Monitoring / APM | 🔴 Not Implemented | Winston console-only transport; zero Sentry or equivalent, confirmed by repo-wide grep |
| Rate limiting | 🟡 Partial | 5 dedicated limiters across 2 of 9 route files; rest share a 300/min blanket |
| Caching (query layer) | ✅ Implemented | TanStack Query, 60s `staleTime`, sane retry policy |
| Env config hygiene | ✅ Implemented | No drift between `env.ts` schema and `.env.example` |

Nothing here blocks a small-scale soft launch, but nothing here would survive a real incident either — there's no automated regression net and no way to know a deploy broke something except a user reporting it.

---

## 8. Authentication Audit — 92%

- **JWT issuance** ✅ — Access 15min / refresh 30d, HS256. `backend/src/utils/jwt.ts`.
- **Refresh rotation + replay detection** ✅ — New token issued every refresh; reuse of a revoked token revokes the entire session family. `auth.service.ts:200-222`.
- **Password security** ✅ — bcrypt cost 12, last-5-password reuse block, force logout-all on password change.
- **Google OAuth flow** ✅ — Redirect → callback → find-or-link-or-create → token issue. Complete server-side.
- **OAuth CSRF protection** 🔴 *(new finding)* — No `state` parameter is generated or verified anywhere in the Google login flow (`auth.service.ts:343-359`, `auth.controller.ts:103-116`) — a real login-CSRF exposure.
- **Access-token delivery** ⚠ — Returned via a redirect URL query string on OAuth callback — leaks into browser history/referrer/logs. Pre-existing, not new.

Frontend exposes Google OAuth only, by deliberate, consistent design (no dead password-login UI found this pass). RBAC's `authorize()` middleware and service-layer ownership checks are both permission-set based, never role-name string comparisons — verified across all 8 route files.

## 9. Contributor System Audit — 97%

The single most complete subsystem in the project. Full lifecycle verified in code, both directions:

1. **Submit application** ✅ — Blocks duplicate active applications, enforces a 30-day cooldown after rejection.
2. **Admin review — approve / reject / request revision** ✅ — All three decisions wired end-to-end with dialogs, reasons, notifications, and email.
3. **Approval → role upgrade** ✅ *(transactional)* — `prisma.$transaction` updates the application row **and** upserts a real `contributor` role assignment — not a status flag pretending to be a role change.
4. **Withdraw / reapply** ✅ — Cooldown correctly applies only after rejection, not after a voluntary withdrawal.
5. **Submit-page lockout** ✅ — `RoleGuard` + a status-aware lock screen — reflects the applicant's actual live status.

Only soft gap: the admin review screen's "quality indicators" panel intentionally returns `available: false` placeholders for a future ML-based scoring feature — honestly labeled as not-yet-built rather than faked.

## 10. Resource System Audit — 90%

CRUD, all 7 types (dataset/paper/tool/tutorial/prompt/project/news), the universal multi-file attachment system, visibility enforcement, and the delete policy are all implemented correctly and match their design intent.

| Capability | Status | Note |
|---|---|---|
| Approved → pending reset on owner edit | ✅ Correct | Scoped to owner-only edits; moderator edits via `resource:edit_any` do not trigger resubmission |
| Delete policy | ✅ Correct | Hard-delete pending/rejected + R2 cleanup; soft-delete approved; `resource:delete_any` override gated |
| Visibility enforcement | ✅ Correct | Private/non-approved → 404 (never 403, avoids existence leaks) |
| Download URL vs. confirm split | ✅ Correct | Issuing a URL never increments `download_count`; a separate confirm call does |
| Universal attachments (7 types) | ✅ Correct | Add / delete / replace / reorder all implemented, reorder validates the full ID set |
| Thumbnail resend-signed-URL bug | ✅ Fixed | Dirty-check added this session |
| Paper PDF resend-signed-URL bug | 🔴 Not Fixed *(new finding)* | Same bug class, missed. See §20, Bug #1. |
| Version history | 🔴 Not Implemented | Deferred by design, confirmed no partial scaffolding exists |

## 11. Storage / Cloudflare R2 Audit — 92%

- **Upload pipeline** — Single `validateFile()` entry point for every upload kind: size limit, path-traversal guard, dangerous-extension blocklist (including disguised double extensions like `invoice.exe.pdf`), MIME/extension agreement, and magic-byte sniffing via `file-type` where a binary signature exists. No upload kind bypasses it.
- **Signed URLs** — Raw R2 object keys are never returned to the client anywhere (confirmed via grep across the frontend for `storage_key`). `getSignedDownloadUrl()` supports a forced-filename download override via `ResponseContentDisposition`.
- **Error handling** — `putObject()` wraps the R2 call in try/catch and returns a clean 503 instead of leaking a raw TLS/SDK error. `deleteObject()` itself is unwrapped, but every call site wraps it in `.catch(() => {})` — safe in practice, inconsistent in principle.
- **Replace / cleanup** — Upload-then-delete-previous ordering is correct everywhere. No storage-cleanup cron exists — confirmed via grep, correctly deferred rather than half-built.
- Preview and download UX (PDF preview dialog, admin attachment panel with checksum/size/masked storage location/delete/preview/download) all verified real.

## 12. Analytics Audit — 68%

View, download, and share events are genuinely written to `ResourceAnalytics` — not just counted inline. The "issue a URL" vs. "confirm the download" split is implemented exactly as designed: the GET that hands back a signed URL never touches `downloadCount`; a separate POST confirm call does the increment and writes the analytics row.

The user-facing dashboard consumes this data well (total views/downloads/bookmarks/shares, most-downloaded resource, 5 recent downloads — all real query results). What's missing is the admin side: **no admin analytics dashboard exists** — no top-resources list, no download-trend view. The admin dashboard shows moderation stats only.

## 13. Dashboard Audit — 95% (user) / 82% (admin)

**User dashboard** is fully real and live-backed: submission status counts, view/download/bookmark sums, unread-notification count, reputation score, share count, most-downloaded resource, and recent downloads all map 1:1 to a real backend aggregation (`UsersService.getDashboard()`).

**Admin dashboard** renders 8 live stat cards plus status/type breakdowns, pending-approvals, recent-applications, recent-resources, recent-users, and an 8-item activity feed — all backed by one real, 16-way parallel Prisma aggregation. The one gap: the activity feed is the *only* audit-log surface in the entire admin UI — no dedicated, filterable audit-log page exists despite the backend fully supporting one.

## 14. Admin Panel Audit — 82%

| Nav entry | Route | Status |
|---|---|---|
| Dashboard | `/admin` | ✅ Real |
| Pending Approvals | `/admin/pending` | ✅ Real |
| Contributor Applications | `/admin/contributor-applications[/id]` | ✅ Real |
| Users | `/admin/users` | ✅ Real |
| Reports | `/admin/reports` | 🔴 Stub — `ComingSoonPage` |

**Notable pattern:** the Reports nav entry is styled, iconed, and role-gated identically to the four real entries next to it — a moderator has no visual cue that clicking it lands on an empty page. The backend (`report:resolve`/`report:reject` routes, full `AdminService` support) is completely ready; nothing on the frontend — not even the API client function — has been written for it. This is the exact "stub disguised as a feature" pattern the prior audit flagged for the entire admin layer, now narrowed to one remaining screen.

Everything else — resource approve/reject/feature/unfeature/restore, user role/status/delete, contributor-application decisions — is wired to real mutations with confirm dialogs and toasts, invalidating the right queries afterward.

## 15. Security Audit — 72%

| Control | Status | Detail |
|---|---|---|
| JWT | ✅ Solid | Rotation + replay detection verified |
| Google OAuth | 🟡 Gap | No `state` param — login-CSRF exposure (new finding) |
| RBAC / permission guards | ✅ Solid | Permission-set based, not role-string based, everywhere checked |
| Refresh-cookie CSRF | ✅ Solid | `httpOnly`, `secure` in prod, `sameSite=strict`, path-scoped |
| SQL injection | ✅ Clean | Zero raw queries in application code — all Prisma typed queries |
| XSS — resource descriptions | ✅ Safe | Rendered as plain React text, auto-escaped |
| XSS — JSON-LD script tag | 🔴 Vulnerable *(new finding)* | Unescaped `JSON.stringify` into a `<script>` tag; user title/description/display-name can break out |
| File upload validation | ✅ Strong | Consistent across all 8 upload kinds |
| Signed URLs / private & unlisted resources | ✅ Correct | 404-not-403 discipline, no raw keys ever exposed |
| Admin overrides | ✅ Correct | Explicit permission checks, not role-name comparisons |
| Rate limiting | 🟡 Partial | 5 of ~9 documented rule groups wired; resource-submit, report, search, admin, comments, notifications all blanket-only |
| Sensitive data / secrets in code | 🟡 Unresolved carry-over | `.env.example`'s `DATABASE_URL` still reads as a real credential shape, unrotated since initial commit |
| `isomorphic-dompurify` | ⚠ Dead dependency | Installed, zero usages — would matter the moment rich-text (Tiptap is already installed but unwired) ships |

## 16. Performance Audit — 74%

- **Pagination** ✅ — Real everywhere checked: genuine `count`+`findMany` pairs with total returned, no fetch-all-then-slice.
- **N+1 queries** ✅ — Clean on list/read paths; one bounded, low-impact N+1 on the tag-linking write path only.
- **Over-fetch on list pages** ⚠ — Every resource in a list response gets `dataset`+`paper`+`tool` joined (only one is ever populated) and a signed URL generated for *every attachment file*, on every page load — real, avoidable CPU/allocation cost multiplying across a card grid that only renders a thumbnail.
- **Memoization** ⚠ — Inconsistent: `ResourceListingView` uses `useMemo`/`useCallback` deliberately; `ResourceGrid`/`ResourceCard` use none.
- **Image optimization** 🟡 — Deliberately absent: `next/image` is not used anywhere; a documented, reasoned tradeoff (signed R2 URLs and arbitrary external thumbnails have no fixed domain to allowlist), but a real cost regardless.
- **Caching** ✅ — TanStack Query, 1-minute staleTime, focus-refetch disabled.
- **Bundle size** ✅ — No bundle-analysis tooling configured, but no bloated dependencies found either.

## 17. Documentation Audit

| Doc | Claim | Reality |
|---|---|---|
| 04 — Technical Architecture | "Data Models" section lists `qualityScore`, bilingual title fields, `Discussion`, `Profile`, `ResourceVersion` | None of these exist. Doc 10 superseded doc 04 as the real schema source of truth, but doc 04 was never updated to match — still reads as current spec to anyone who opens it first. |
| 10 — Database Design | `notification_type` comment lists 6 values | Schema has 10 (5 contributor-application values added by later migrations, never backfilled into the doc's prose) |
| 08 — Dataset Acceptance Policy | 3-tier quality system (Community/Verified/Certified) with concrete numeric thresholds | No `qualityTier`/`qualityScore` field exists anywhere in schema — carried over unchanged from the prior audit |
| 11 — API Specification | Comments API fully specified, 5 endpoints | All 5 return HTTP 501 unconditionally — a developer reading only doc 11 would reasonably assume this works |

**Verification note:** doc 02 (product vision)'s previously-flagged claims — "Auth: Email + Google + GitHub," "API: REST + GraphQL" — were **not re-independently verified this pass** (outside this audit's read list); the prior audit found both overstated relative to implementation. Treat that specific finding as carried forward, not freshly confirmed.

---

## 18. Feature Matrix

| Feature | Status | % | Missing Parts | Priority | Risk |
|---|---|---|---|---|---|
| JWT / session auth | ✅ Done | 98 | — | — | Low |
| Google OAuth | 🟡 Partial | 85 | CSRF `state` param | High | Medium |
| RBAC | ✅ Done | 95 | `verified_contributor` tier unused | Low | Low |
| Contributor application | ✅ Done | 97 | ML quality indicators (deferred) | Low | Low |
| Resource CRUD (7 types) | ✅ Done | 95 | — | — | Low |
| Resource attachments | ✅ Done | 95 | — | — | Low |
| Paper PDF edit | 🟡 Bug | 70 | Signed-URL resend bug | High | High |
| Delete policy (hard/soft) | ✅ Done | 95 | — | — | Low |
| Storage / R2 pipeline | ✅ Done | 92 | Cleanup cron (deferred) | Low | Low |
| Admin: resource moderation | ✅ Done | 95 | — | — | Low |
| Admin: user management | ✅ Done | 95 | — | — | Low |
| Admin: reports | 🔴 Missing | 15 | Entire frontend | High | Medium |
| Admin: audit log page | 🔴 Missing | 20 | Dedicated filterable page | Medium | Low |
| Notifications (write) | ✅ Done | 80 | More trigger events | Medium | Low |
| Notifications (read UI) | 🔴 Missing | 0 | Entire page | High | Medium |
| Reputation (write) | 🟡 Partial | 22 | 7 of 9 documented events | Medium | Low |
| Reputation tier UI | ✅ Done | 100 | — | — | Low |
| Email events | 🟡 Partial | 58 | 6 events, incl. report-resolved & weekly digest | Medium | Low |
| Analytics (writes) | ✅ Done | 90 | — | — | Low |
| Analytics (admin dashboard) | 🔴 Missing | 0 | Top resources / trend views | Low | Low |
| Search (MeiliSearch) | ✅ Done | 98 | — | — | Low |
| Categories | 🟡 Partial | 85 | Admin management UI | Low | Low |
| Bookmarks | 🟡 Partial | 50 | Entire frontend | High | Low |
| Comments | 🔴 Missing | 0 | Everything, both layers | Medium (Phase 2, in-window) | Medium |
| User dashboard | ✅ Done | 95 | — | — | Low |
| Settings — Profile edit | 🔴 Missing | 0 | Entire edit form | Medium | Low |
| Settings — Notification prefs | 🔴 Missing | 0 | Entire feature | Low | Low |
| JSON-LD SEO block | 🟡 Bug | 80 | Stored-XSS via unescaped script injection | High | High |
| Rate limiting breadth | 🟡 Partial | 55 | 4 of 9 route files uncovered | Medium | Medium |
| Automated testing | 🔴 Missing | 0 | Everything | Medium | High (long-term) |
| CI/CD + deployment config | 🔴 Missing | 0 | Everything | Medium | Medium |

---

## 19. Missing Features

**UI missing over a working API (highest-leverage gaps):**
- Bookmarks — backend 100% done; no button, no list page.
- Notifications — backend now writes real rows; no page to read them.
- Admin Reports — backend fully done; zero frontend code, not even an API client function.
- Admin audit log — backend supports filter/paginate; frontend only shows a fixed 8-item feed.
- Settings → Profile edit — a read-only card links to a stub.
- Categories admin management — CRUD exists at the API layer, no UI exercises it.

**Missing at both layers:**
- Comments — roadmap-correct (Phase 2, now in-window), but genuinely zero logic anywhere.
- Admin content-analytics dashboard — top resources, download trends.
- Weekly digest, report-resolved, account-suspended, reputation-milestone, new-follower, comment-reply emails — 6 of the original 10 documented email events.
- 7 of 9 reputation trigger events — comment upvote, accepted edit, report-validation reward/penalty.

**Infrastructure:**
- No tests, no CI, no deployment config, no external monitoring.

---

## 20. Bugs Found

### Bug 1 — High · Data corruption
**Paper PDF link silently corrupted on edit.** `EditResourceView.tsx` guards against resending a resolved (signed) `thumbnail_url` back to the backend as if it were a permanent value — but the identical hazard on `paper.pdf_url` was missed. `ResourceTypeFields.tsx:184-192` binds a plain input to the already-resolved signed PDF URL, and `handleSubmit` sends the whole `paper` object unconditionally on every save. Editing any field on an R2-hosted paper silently replaces its permanent object key with a URL that expires in one hour, and orphans the old R2 object. **Fix pattern already exists in the same file for thumbnails** — apply the same dirty-check.

### Bug 2 — High · Security
**Stored XSS via JSON-LD script injection.** `frontend/src/components/seo/JsonLd.tsx:36-39` builds a `<script type="application/ld+json">` tag from `JSON.stringify()` without escaping `</script>` sequences. A resource title/description, or any user's `display_name`, containing `</script><script>...</script>` would prematurely close the JSON-LD block and inject an executable script into a public, unauthenticated resource-detail page.

### Bug 3 — High · Security
**Google OAuth has no CSRF state parameter.** Neither `getGoogleAuthUrl()` nor the callback handler generates or verifies an OAuth `state` value — a classic login-CSRF gap allowing a forged callback to pre-link an attacker's Google account or force a login.

### Bug 4 — Medium · UX / trust
**Admin "Reports" nav entry is indistinguishable from real ones.** Same icon treatment, same role-gating, sits directly beside four fully-functional entries — a moderator gets no visual signal before landing on an empty page.

### Bug 5 — Low · Code quality
**Inconsistent error-handling depth on `deleteObject()`.** `storage.service.ts`'s `deleteObject()` doesn't wrap its own R2 call in try/catch (unlike `putObject()`); every call site currently wraps it externally, so it's not exploitable today, but it's one missed call site away from a leak.

### Bug 6 — Low · Cosmetic
**Stale SEO copy on `/tools`.** `tools/page.tsx`'s metadata description still reads "Tools and tutorials shared by the community" — a leftover from before tutorials got its own dedicated page.

---

## 21. Technical Debt

- Dead exports — `StatsCard.tsx` (duplicate of `StatCard.tsx`), `useApi.ts`, `useCurrentUser.ts` — zero call sites each, confirmed by grep.
- `isomorphic-dompurify` installed, never used — becomes load-bearing the moment the already-installed-but-unwired Tiptap editor ships.
- `/profile` page vs. Settings→Profile tab — two read-only views of the same data; only path to actually edit is a stub.
- `deleteObject()` missing source-level error handling (see Bug 5).
- Doc 04 stale relative to doc 10/schema — risk of a future contributor building against the wrong spec if they open doc 04 first.
- `verified_contributor` role tier exists in the hierarchy but has zero differentiated permissions from `contributor` — either build its purpose or remove the tier.
- No pruning job for `RefreshToken` — rotation creates a new row every refresh; revoked rows are never deleted, table grows unbounded.

---

## 22. Production Risks

| Risk | Severity | Why it matters at scale |
|---|---|---|
| Zero automated tests / CI | High | Every deploy is a manual gamble; regressions surface via user reports, not pipelines |
| No monitoring/APM | High | An incident in production is invisible until someone complains — console logging only |
| Unrotated credential-shaped value in `.env.example` | High | Carried over unresolved from the prior audit; needs a human to open the file and confirm/rotate |
| `ResourceAnalytics` unbounded, unindexed growth | Medium | Every view/download/share writes a row with no retention policy and no supporting index |
| Rate-limit blanket-only coverage on uploads/admin/search | Medium | 300/min/IP is much looser than the documented per-route limits on exactly the endpoints worth protecting |
| JSON-LD stored XSS | High | Public, unauthenticated attack surface on every resource page |
| No deployment/rollback tooling | Medium | No documented or scripted path to actually ship this to Vercel/Render yet |

---

## 23. High Priority Tasks

1. Fix the paper-PDF signed-URL resend bug — same pattern already solved for thumbnails.
2. Fix the JSON-LD stored-XSS injection — escape `</` sequences before embedding in the script tag.
3. Add an OAuth `state` parameter to the Google login flow.
4. Verify and rotate the credential-shaped value in `backend/.env.example`.
5. Build the Bookmarks frontend (button + list page) — backend is complete, this is pure wiring.
6. Build the Notifications frontend page — backend now writes real data with nowhere for users to read it.
7. Build the Admin Reports frontend, or demote its nav entry until it exists so it stops looking like a working feature.

## 24. Medium Priority Tasks

1. Extend rate limiting to resource-submit, report, search, and admin routes per the documented table.
2. Build Settings → Profile edit (the read-only card already links to it).
3. Expand reputation trigger events beyond submission approve/reject.
4. Build the remaining 6 email events, prioritizing report-resolved and account-suspended.
5. Add a dedicated, filterable admin audit-log page.
6. Add indexes on `Report`, `ResourceAnalytics`, and `RefreshToken.userId`; add a refresh-token pruning job.
7. Reconcile doc 04 with the real schema (doc 10 is already correct).

## 25. Low Priority Tasks

1. Delete dead exports: `StatsCard.tsx`, `useApi.ts`, `useCurrentUser.ts`.
2. Remove the unused `isomorphic-dompurify` dependency, or wire it in before Tiptap ships.
3. Consolidate `/profile` and Settings→Profile once editing exists.
4. Fix the stale "Tools and tutorials" copy on `/tools`.
5. Decide the purpose of the `verified_contributor` tier or remove it.
6. Add a category-management admin UI.
7. Add a memoization pass to `ResourceGrid`/`ResourceCard` and trim the list-endpoint over-fetch.

---

## 26. Recommended Next Phase

Based on actual current state, not the roadmap's original sequencing assumption (written before this much of Phase 1+2 had shipped):

1. **Now — Security & data-integrity fixes.** Bugs 1–3 above. Fast, isolated, should not wait for a phase boundary.
2. **Phase 2.4 — Close the stub gaps.** Bookmarks, Notifications, Admin Reports, Settings→Profile. Every one of these is frontend-only work against an already-finished backend — the highest ratio of user-visible impact to engineering effort available right now.
3. **Phase 2.5 — Comments.** Roadmap-due now (Q3 2026). Full-stack build, sequence after 2.4 since it's net-new rather than wiring.
4. **Phase 2.6 — Reputation & email breadth.** Widen both once comments exist (unlocks comment-upvote reputation events and comment-reply emails as a natural pair).
5. **Phase 2.7 — Infrastructure floor.** A minimal CI pipeline (lint + typecheck + build on PR) and a first integration test suite against the now-real endpoints, before Phase 3 adds more surface area to test blind.
6. **Phase 3.** Per `03-5-year-roadmap.md`'s own sequencing — correctly not started yet.

## 27. Estimated Remaining Work

| Workstream | Rough size |
|---|---|
| 3 high-priority bug fixes (§20, Bugs 1–3) | Small — hours, not days |
| 4 stub pages against existing backends (Bookmarks, Notifications, Reports, Profile edit) | Small–Medium — each is a self-contained wiring task |
| Comments (full stack) | Medium–Large — new model logic + moderation + UI |
| Reputation + email breadth | Medium — mechanical, follows existing patterns |
| Rate-limit breadth + index/pruning fixes | Small — mechanical, existing helpers |
| Infrastructure floor (CI + first tests) | Medium — nothing exists yet, but tooling is already installed |

## 28. Production Readiness Score

**6.4 / 10** — Strong enough to run a controlled beta with real users today, contingent on the three high-priority fixes in §20. Not yet ready for an unmonitored, unattended production launch — the infrastructure floor (§7) is the binding constraint, not feature completeness.

| Dimension | Score /10 |
|---|---|
| Feature completeness | 7.6 |
| Code quality & consistency | 8.2 |
| Security posture | 6.5 |
| Database design & safety | 8.0 |
| Performance | 7.0 |
| Infrastructure / operability | 2.0 |

## 29. Final Verdict

Bangla AI Hub is a well-engineered product that is further along than its own team may realize, and less ready to run unattended than a 76% completion number suggests. The gap between those two facts is entirely explained by where the remaining 24% sits: concentrated in four finished-backend/missing-frontend screens, one roadmap-correct unbuilt feature (comments), and an infrastructure layer that hasn't been started. None of that is architectural risk — it's a punch list.

The two new bugs found this pass (signed-URL resend on papers, JSON-LD script injection) are the only findings that should change anyone's plans before the next work session — both are small, both are exact-pattern matches for fixes already proven elsewhere in the same codebase. Everything else in this report is sequencing, not rescue.

---

*This report is a point-in-time snapshot generated 2026-07-08. It does not modify any code, configuration, or documentation file other than itself. A companion interactive version (with full feature-matrix tables and inline navigation) was also produced for this audit; this file is the durable, repo-tracked record.*
