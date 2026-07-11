# Bangla AI Hub — Database Design
**Document:** 10  
**Version:** 1.0  
**Status:** Foundation Draft  
**Date:** July 2026

---

## Design Principles

1. **Universal Resource Schema** — সব resource type (dataset, paper, tool, tutorial) একটি common base থেকে extend করবে
2. **Soft Delete (mostly)** — `deleted_at` timestamp is the default for anything that was ever public. As of
   Phase 2.3, a `pending`/`rejected` resource (never approved, never public) is hard-deleted immediately
   instead — nothing worth a moderation trail for. An `approved` resource is still always soft-deleted;
   an admin (`resource:delete_any`) can force a hard delete on any resource regardless of status.
3. **Audit Log** — সব গুরুত্বপূর্ণ action log হবে
4. **RBAC** — Role Based Access Control for all permissions
5. **Slug-based URLs** — SEO-friendly URLs (`/datasets/bangla-sentiment-v1` not `?id=17`)
6. **Timestamps everywhere** — `created_at`, `updated_at`, `deleted_at` সব table-এ

---

## Entity Relationship Overview

```
Users ──────────── Resources (Universal Base)
  │                    │
  │              ┌─────┴─────┐─────────┐
  │           Datasets    Papers    Tools/Tutorials
  │
  ├── Roles ──── Permissions
  │
  ├── Bookmarks ──── Resources
  │
  ├── Comments ──── Resources
  │
  ├── Reports ──── Resources
  │
  ├── Notifications
  │
  ├── Reputation_Events
  │
  ├── Contributor_Applications ──── (grants) ──── Roles
  │
  └── Audit_Logs
```

---

## Tables

### 1. `users`

```sql
users
├── id               UUID PRIMARY KEY DEFAULT gen_random_uuid()
├── email            VARCHAR(255) UNIQUE NOT NULL
├── username         VARCHAR(50) UNIQUE NOT NULL
├── display_name     VARCHAR(100)
├── avatar_url       TEXT
├── bio              TEXT
├── institution      VARCHAR(200)        -- University / Company
├── location         VARCHAR(100)
├── website_url      TEXT                -- also doubles as "personal website / portfolio"
├── github_url       TEXT
├── scholar_url      TEXT                -- Google Scholar
├── kaggle_url       TEXT
├── huggingface_url  TEXT
├── linkedin_url     TEXT
├── orcid_id         VARCHAR(19)         -- e.g. 0000-0002-1825-0097
├── x_url            TEXT                -- X (Twitter)
├── external_stats    JSONB              -- reserved for future GitHub/Kaggle/HF/Scholar
│                                          stats + AI trust score; unused today, nullable
│                                          so it needs no migration when that work starts
├── headline          VARCHAR(200)       -- Phase 4B: short tagline shown under display_name
├── cover_image        TEXT              -- Phase 4B: profile banner (R2 key, mirrors avatar_url)
├── gitlab_url         TEXT              -- Phase 4B
├── research_interests TEXT[]            -- Phase 4B
├── skills             TEXT[]            -- Phase 4B
├── languages          TEXT[]            -- Phase 4B: spoken/working languages
├── profile_visibility VARCHAR(20) DEFAULT 'public'  -- Phase 4B: public | private | followers_only
├── follower_count     INTEGER DEFAULT 0 -- Phase 4B: denormalized, mirrors resources.bookmark_count
├── following_count    INTEGER DEFAULT 0 -- Phase 4B
├── reputation_score INTEGER DEFAULT 0
├── is_verified      BOOLEAN DEFAULT FALSE
├── email_verified   BOOLEAN DEFAULT FALSE
├── status           VARCHAR(20) DEFAULT 'active'  -- active | suspended | banned
├── password_hash    TEXT                -- NULL if OAuth-only
├── google_id        VARCHAR(100) UNIQUE
├── github_id        VARCHAR(100) UNIQUE
├── last_login_at    TIMESTAMPTZ
├── created_at       TIMESTAMPTZ DEFAULT NOW()
├── updated_at       TIMESTAMPTZ DEFAULT NOW()
└── deleted_at       TIMESTAMPTZ         -- soft delete
```

---

### 2. `roles`

```sql
roles
├── id               SERIAL PRIMARY KEY
├── name             VARCHAR(50) UNIQUE NOT NULL
│                    -- guest | user | contributor | verified_contributor
│                    -- moderator | editor | admin | super_admin
├── description      TEXT
├── created_at       TIMESTAMPTZ DEFAULT NOW()
└── updated_at       TIMESTAMPTZ DEFAULT NOW()
```

### 3. `permissions`

```sql
permissions
├── id               SERIAL PRIMARY KEY
├── name             VARCHAR(100) UNIQUE NOT NULL
│                    -- e.g.: resource:create, resource:delete, user:ban
├── description      TEXT
├── created_at       TIMESTAMPTZ DEFAULT NOW()
└── updated_at       TIMESTAMPTZ DEFAULT NOW()
```

### 4. `role_permissions` (Junction Table)

```sql
role_permissions
├── role_id          INTEGER REFERENCES roles(id)
├── permission_id    INTEGER REFERENCES permissions(id)
└── PRIMARY KEY (role_id, permission_id)
```

### 5. `user_roles` (Junction Table)

```sql
user_roles
├── user_id          UUID REFERENCES users(id)
├── role_id          INTEGER REFERENCES roles(id)
├── assigned_by      UUID REFERENCES users(id)
├── assigned_at      TIMESTAMPTZ DEFAULT NOW()
└── PRIMARY KEY (user_id, role_id)
```

> `user` → `contributor` is granted through this table too, but the row is normally created
> by the Contributor Application approval flow, not typed in directly by an admin. See
> table 21, `contributor_applications`, below.

---

### 6. `resources` (Universal Base — সব resource এখানে)

```sql
resources
├── id               UUID PRIMARY KEY DEFAULT gen_random_uuid()
├── slug             VARCHAR(200) UNIQUE NOT NULL  -- bangla-sentiment-dataset-v2
├── title            VARCHAR(300) NOT NULL
├── description      TEXT
├── type             VARCHAR(50) NOT NULL
│                    -- dataset | paper | tool | tutorial | prompt | project | news | model
├── category_id      INTEGER REFERENCES categories(id)
├── author_id        UUID REFERENCES users(id)
├── status           VARCHAR(20) DEFAULT 'pending'
│                    -- pending | approved | rejected | flagged
├── visibility       VARCHAR(20) DEFAULT 'public'
│                    -- public | unlisted | private
├── language         VARCHAR(10) DEFAULT 'bn'  -- ISO 639: bn, en, both
├── thumbnail_url    TEXT
├── documentation_url TEXT                      -- optional PDF/MD/TXT doc, any resource type
├── external_url     TEXT                       -- GitHub, HuggingFace, etc.
├── license          VARCHAR(100)               -- MIT, CC-BY-4.0, etc.
├── view_count       INTEGER DEFAULT 0
├── download_count   INTEGER DEFAULT 0
├── bookmark_count   INTEGER DEFAULT 0
├── avg_rating       FLOAT8                     -- Phase 4A — recomputed from reviews, null until first review
├── review_count     INTEGER DEFAULT 0          -- Phase 4A
├── like_count       INTEGER DEFAULT 0          -- Phase 4A
├── featured         BOOLEAN DEFAULT FALSE
├── approved_by      UUID REFERENCES users(id)
├── approved_at      TIMESTAMPTZ
├── published_at     TIMESTAMPTZ
├── created_at       TIMESTAMPTZ DEFAULT NOW()
├── updated_at       TIMESTAMPTZ DEFAULT NOW()
└── deleted_at       TIMESTAMPTZ               -- soft delete
```

---

### 7. `datasets` (extends resources)

```sql
datasets
├── id               UUID PRIMARY KEY DEFAULT gen_random_uuid()
├── resource_id      UUID UNIQUE REFERENCES resources(id) ON DELETE CASCADE
├── version          VARCHAR(20) DEFAULT 'v1.0'
├── file_url         TEXT                       -- Cloudflare R2 URL
├── file_size_bytes  BIGINT
├── file_format      VARCHAR(50)               -- CSV, JSON, TXT, ZIP
├── record_count     INTEGER
├── annotation_type  VARCHAR(100)              -- classification, NER, POS, etc.
├── domain           VARCHAR(100)              -- news, social, medical, legal
├── collection_year  INTEGER
├── data_source      TEXT
├── methodology      TEXT
├── benchmark_score  JSONB                     -- {accuracy: 0.91, f1: 0.89}
├── checksum_sha256  VARCHAR(64)
├── parent_id        UUID REFERENCES datasets(id)  -- for versioning: v1 → v2
├── created_at       TIMESTAMPTZ DEFAULT NOW()
└── updated_at       TIMESTAMPTZ DEFAULT NOW()
```

### 8. `papers` (extends resources)

```sql
papers
├── id               UUID PRIMARY KEY DEFAULT gen_random_uuid()
├── resource_id      UUID UNIQUE REFERENCES resources(id) ON DELETE CASCADE
├── abstract         TEXT
├── authors          TEXT[]                    -- ['Author A', 'Author B']
├── venue            VARCHAR(200)              -- ACL 2024, NeurIPS 2024
├── year             INTEGER
├── doi              VARCHAR(200)
├── arxiv_id         VARCHAR(50)
├── pdf_url          TEXT
├── code_url         TEXT
├── citation_count   INTEGER DEFAULT 0
├── created_at       TIMESTAMPTZ DEFAULT NOW()
└── updated_at       TIMESTAMPTZ DEFAULT NOW()
```

### 9. `tools` (extends resources — tools, tutorials)

```sql
tools
├── id               UUID PRIMARY KEY DEFAULT gen_random_uuid()
├── resource_id      UUID UNIQUE REFERENCES resources(id) ON DELETE CASCADE
├── tool_type        VARCHAR(50)               -- library | api | model | prompt | tutorial
├── platform         VARCHAR(100)              -- Python, JavaScript, HuggingFace
├── demo_url         TEXT
├── install_command  TEXT
├── file_url         TEXT                      -- packaged tool asset (zip/tar/gz), R2 key
├── file_size_bytes  BIGINT
├── checksum_sha256  VARCHAR(64)
├── created_at       TIMESTAMPTZ DEFAULT NOW()
└── updated_at       TIMESTAMPTZ DEFAULT NOW()
```

### 9a. `models` (extends resources — Phase 3A Model Hub)

Weight file itself reuses the exact same single-slot upload pattern as `datasets.file_url`/`tools.file_url` (uploaded via `POST /resources/:slug/upload?kind=model`, validated against `StorageService.MODEL_ALLOWED_EXTENSIONS`/`MODEL_MAX_FILE_SIZE`). `parent_id` is a shallow version-history link, same convention as `datasets.parent_id`.

```sql
models
├── id                 UUID PRIMARY KEY DEFAULT gen_random_uuid()
├── resource_id        UUID UNIQUE REFERENCES resources(id) ON DELETE CASCADE
├── architecture       VARCHAR(200)              -- transformer, mamba, mixture-of-experts…
├── base_model         VARCHAR(200)              -- e.g. "Llama-3-8B" if fine-tuned/quantized from a base
├── format             VARCHAR(20)               -- gguf | safetensors | onnx | pytorch | tensorflow | mlx | lora | adapter | other
├── quantization       VARCHAR(100)              -- Q4_K_M, INT8, FP16…
├── context_length     INTEGER
├── parameters         VARCHAR(50)               -- "7B", "13B", "1.5B"
├── precision          VARCHAR(50)               -- fp16, fp32, int8, int4…
├── gpu_requirement     TEXT
├── ram_requirement     TEXT
├── benchmark_score    JSONB                     -- {mmlu: 0.68, bangla_eval: 0.81}
├── inference_example  TEXT                      -- sample code/CLI to run the model
├── version            VARCHAR(20) DEFAULT 'v1.0'
├── changelog          TEXT
├── demo_url           TEXT
├── repository_url     TEXT
├── paper_url          TEXT
├── file_url           TEXT                      -- Cloudflare R2 key, the model weight file
├── file_size_bytes    BIGINT
├── checksum_sha256    VARCHAR(64)
├── parent_id          UUID REFERENCES models(id)   -- version history: v1 → v2
├── created_at         TIMESTAMPTZ DEFAULT NOW()
└── updated_at         TIMESTAMPTZ DEFAULT NOW()
```

### 9b. `prompts` (extends resources — Phase 3A Prompt Hub)

`parent_id` doubles as the "Fork Prompt" relationship (same shallow self-link convention as `models.parent_id`/`datasets.parent_id`) — no separate fork-count column, computed on demand like every other derived count in this schema.

```sql
prompts
├── id                 UUID PRIMARY KEY DEFAULT gen_random_uuid()
├── resource_id        UUID UNIQUE REFERENCES resources(id) ON DELETE CASCADE
├── role               VARCHAR(20) DEFAULT 'user'   -- system | developer | user
├── content            TEXT NOT NULL                -- the actual prompt body
├── target_platforms   TEXT[]                       -- chatgpt, claude, gemini, midjourney, cursor…
├── variables          JSONB                        -- [{name, description, default_value}]
├── difficulty         VARCHAR(20)                  -- beginner | intermediate | advanced
├── example_output     TEXT
├── version            VARCHAR(20) DEFAULT 'v1.0'
├── parent_id          UUID REFERENCES prompts(id)  -- fork-of / version-of
├── created_at         TIMESTAMPTZ DEFAULT NOW()
└── updated_at         TIMESTAMPTZ DEFAULT NOW()
```

---

### 10. `categories`

```sql
categories
├── id               SERIAL PRIMARY KEY
├── name             VARCHAR(100) NOT NULL
├── slug             VARCHAR(100) UNIQUE NOT NULL
├── description      TEXT
├── parent_id        INTEGER REFERENCES categories(id)  -- subcategory support
├── icon             VARCHAR(50)               -- emoji or icon name
├── sort_order       INTEGER DEFAULT 0
├── created_at       TIMESTAMPTZ DEFAULT NOW()
└── updated_at       TIMESTAMPTZ DEFAULT NOW()
```

### 11. `tags`

```sql
tags
├── id               SERIAL PRIMARY KEY
├── name             VARCHAR(100) UNIQUE NOT NULL
├── slug             VARCHAR(100) UNIQUE NOT NULL
└── usage_count      INTEGER DEFAULT 0
```

### 12. `resource_tags` (Junction Table)

```sql
resource_tags
├── resource_id      UUID REFERENCES resources(id) ON DELETE CASCADE
├── tag_id           INTEGER REFERENCES tags(id) ON DELETE CASCADE
└── PRIMARY KEY (resource_id, tag_id)
```

---

### 13. `bookmarks`

```sql
bookmarks
├── id               UUID PRIMARY KEY DEFAULT gen_random_uuid()
├── user_id          UUID REFERENCES users(id) ON DELETE CASCADE
├── resource_id      UUID REFERENCES resources(id) ON DELETE CASCADE
├── created_at       TIMESTAMPTZ DEFAULT NOW()
└── UNIQUE (user_id, resource_id)
```

### 14. `comments`

```sql
comments
├── id               UUID PRIMARY KEY DEFAULT gen_random_uuid()
├── resource_id      UUID REFERENCES resources(id) ON DELETE CASCADE
├── author_id        UUID REFERENCES users(id)
├── parent_id        UUID REFERENCES comments(id)  -- reply to comment
├── content          TEXT NOT NULL
├── is_pinned        BOOLEAN DEFAULT FALSE
├── upvote_count     INTEGER DEFAULT 0
├── like_count       INTEGER DEFAULT 0          -- Phase 4A
├── status           VARCHAR(20) DEFAULT 'visible'  -- visible | hidden | deleted
├── created_at       TIMESTAMPTZ DEFAULT NOW()
├── updated_at       TIMESTAMPTZ DEFAULT NOW()
└── deleted_at       TIMESTAMPTZ
```

### 14a. `reviews` (Phase 4A — one review per resource per user)

```sql
reviews
├── id               UUID PRIMARY KEY DEFAULT gen_random_uuid()
├── resource_id      UUID REFERENCES resources(id) ON DELETE CASCADE
├── author_id        UUID REFERENCES users(id)
├── rating           SMALLINT NOT NULL          -- 1..5
├── title            VARCHAR(200)
├── body             TEXT
├── helpful_count    INTEGER DEFAULT 0
├── status           VARCHAR(20) DEFAULT 'visible'  -- visible | hidden | deleted
├── created_at       TIMESTAMPTZ DEFAULT NOW()
├── updated_at       TIMESTAMPTZ DEFAULT NOW()
├── deleted_at       TIMESTAMPTZ                -- soft delete
└── UNIQUE (resource_id, author_id)
```

### 14b. `resource_likes` / `comment_likes` / `review_helpful_votes` (Phase 4A)

Three explicit join tables (mirroring `bookmarks`' shape), each with a per-user unique
constraint and a **hard delete** on unlike/un-helpful (no soft delete — same as bookmarks):

```sql
resource_likes
├── id               UUID PRIMARY KEY DEFAULT gen_random_uuid()
├── user_id          UUID REFERENCES users(id) ON DELETE CASCADE
├── resource_id      UUID REFERENCES resources(id) ON DELETE CASCADE
├── created_at       TIMESTAMPTZ DEFAULT NOW()
└── UNIQUE (user_id, resource_id)

comment_likes
├── id               UUID PRIMARY KEY DEFAULT gen_random_uuid()
├── user_id          UUID REFERENCES users(id) ON DELETE CASCADE
├── comment_id       UUID REFERENCES comments(id) ON DELETE CASCADE
├── created_at       TIMESTAMPTZ DEFAULT NOW()
└── UNIQUE (user_id, comment_id)

review_helpful_votes
├── id               UUID PRIMARY KEY DEFAULT gen_random_uuid()
├── user_id          UUID REFERENCES users(id) ON DELETE CASCADE
├── review_id        UUID REFERENCES reviews(id) ON DELETE CASCADE
├── created_at       TIMESTAMPTZ DEFAULT NOW()
└── UNIQUE (user_id, review_id)
```

### 14c. `posts` / `post_likes` (Phase 4E — user-generated feed status updates)

```sql
posts
├── id               UUID PRIMARY KEY DEFAULT gen_random_uuid()
├── author_id        UUID REFERENCES users(id)
├── content          TEXT NOT NULL              -- max 1000 chars, enforced app-side
├── image_url        TEXT                       -- R2 object key or pasted http(s) URL, same
│                                                -- resolveUrl() convention as resources.thumbnail_url
├── like_count       INTEGER DEFAULT 0
├── status           VARCHAR(20) DEFAULT 'visible'  -- visible | hidden | deleted, reuses comment_status
├── created_at       TIMESTAMPTZ DEFAULT NOW()
├── updated_at       TIMESTAMPTZ DEFAULT NOW()
└── deleted_at       TIMESTAMPTZ

post_likes
├── id               UUID PRIMARY KEY DEFAULT gen_random_uuid()
├── user_id          UUID REFERENCES users(id) ON DELETE CASCADE
├── post_id          UUID REFERENCES posts(id) ON DELETE CASCADE
├── created_at       TIMESTAMPTZ DEFAULT NOW()
└── UNIQUE (user_id, post_id)
```
Any logged-in user can post — instant publish, no approval queue (unlike Resource
submissions); moderated after the fact via the same `reports` flow as comments (see
`comment:delete_any` reuse for moderator removal, no dedicated `post:*` permission added).
Rate-limited at 10/hour/user server-side since there's no approval gate to also act as a
spam brake. Surfaces in the Community/For You feed as a `user_post` card, scored by
freshness + like-count (in place of a resource's download/bookmark/view trending signal)
+ follow/contributor-affinity — see `feed.service.ts`'s `buildPersonalizableSnapshot`.

### 15. `reports`

```sql
reports
├── id               UUID PRIMARY KEY DEFAULT gen_random_uuid()
├── reporter_id      UUID REFERENCES users(id)
├── resource_id      UUID REFERENCES resources(id)
├── comment_id       UUID REFERENCES comments(id)   -- Phase 4A
├── review_id        UUID REFERENCES reviews(id)    -- Phase 4A
├── post_id          UUID REFERENCES posts(id)      -- Phase 4E
├── reason           VARCHAR(50) NOT NULL
│                    -- spam | copyright | wrong_data | duplicate | inappropriate
├── description      TEXT
├── status           VARCHAR(20) DEFAULT 'pending'  -- pending | reviewed | resolved | dismissed
├── reviewed_by      UUID REFERENCES users(id)
├── reviewed_at      TIMESTAMPTZ
├── created_at       TIMESTAMPTZ DEFAULT NOW()
├── updated_at       TIMESTAMPTZ DEFAULT NOW()
└── CHECK (num_nonnulls(resource_id, comment_id, review_id, post_id) <= 1)  -- at most one target
                                                                   -- (0 after a hard-delete SET NULLs it; app layer enforces exactly 1 on create)
```

---

### 16. `notifications`

```sql
notifications
├── id               UUID PRIMARY KEY DEFAULT gen_random_uuid()
├── user_id          UUID REFERENCES users(id) ON DELETE CASCADE
├── type             VARCHAR(50) NOT NULL
│                    -- submission_approved | submission_rejected | comment_reply
│                    -- mention | reputation_milestone | weekly_digest
│                    -- review_received | resource_liked | review_helpful
│                    -- review_removed | comment_removed (Phase 4A)
│                    -- follow_received | badge_received | level_up | milestone_reached (Phase 4B)
├── title            VARCHAR(200) NOT NULL
├── message          TEXT
├── link             TEXT                      -- /datasets/my-dataset
├── is_read          BOOLEAN DEFAULT FALSE
├── created_at       TIMESTAMPTZ DEFAULT NOW()
└── read_at          TIMESTAMPTZ
```

### 17. `reputation_events`

```sql
reputation_events
├── id               UUID PRIMARY KEY DEFAULT gen_random_uuid()
├── user_id          UUID REFERENCES users(id) ON DELETE CASCADE
├── event_type       VARCHAR(50) NOT NULL
│                    -- dataset_submitted | paper_submitted | tutorial_submitted
│                    -- submission_approved | submission_rejected
│                    -- comment_upvoted | edit_accepted | edit_rejected
├── points           INTEGER NOT NULL           -- positive or negative
├── resource_id      UUID REFERENCES resources(id)
├── description      TEXT
└── created_at       TIMESTAMPTZ DEFAULT NOW()
```

**Reputation Point Formula:**
| Event | Points |
|-------|--------|
| Dataset approved | +50 |
| Research paper approved | +30 |
| Tutorial approved | +20 |
| Prompt/Tool approved | +10 |
| Edit accepted | +10 |
| Comment upvoted | +2 |
| Submission rejected | -5 |
| Report validated against user | -10 |

---

### 18. `audit_logs`

```sql
audit_logs
├── id               UUID PRIMARY KEY DEFAULT gen_random_uuid()
├── actor_id         UUID REFERENCES users(id)  -- কে action করল
├── action           VARCHAR(100) NOT NULL
│                    -- resource.approve | resource.reject | resource.delete
│                    -- user.ban | user.role_change | report.resolve
├── target_type      VARCHAR(50)                -- resource | user | comment | report
├── target_id        TEXT                       -- UUID or string ID
├── old_value        JSONB                      -- আগে কী ছিল
├── new_value        JSONB                      -- এখন কী হলো
├── ip_address       INET
├── user_agent       TEXT
└── created_at       TIMESTAMPTZ DEFAULT NOW()
```

---

### 19. `refresh_tokens`

```sql
refresh_tokens
├── id               UUID PRIMARY KEY DEFAULT gen_random_uuid()
├── user_id          UUID REFERENCES users(id) ON DELETE CASCADE
├── token_hash       VARCHAR(64) UNIQUE NOT NULL   -- hashed token
├── expires_at       TIMESTAMPTZ NOT NULL
├── revoked          BOOLEAN DEFAULT FALSE
├── ip_address       INET
├── user_agent       TEXT
├── created_at       TIMESTAMPTZ DEFAULT NOW()
└── revoked_at       TIMESTAMPTZ
```

---

### 20. `resource_analytics`

```sql
resource_analytics
├── id               UUID PRIMARY KEY DEFAULT gen_random_uuid()
├── resource_id      UUID REFERENCES resources(id) ON DELETE CASCADE
├── event_type       VARCHAR(20) NOT NULL          -- view | download | share | bookmark
│                    -- rating | review | comment | reply | like | helpful (Phase 4A)
├── user_id          UUID REFERENCES users(id)      -- NULL for anonymous
├── ip_address       INET
├── referrer         TEXT
└── created_at       TIMESTAMPTZ DEFAULT NOW()
```

---

### 21. `contributor_applications`

Added for the Contributor Application System — the self-serve `user` → `contributor` path
that replaced ad-hoc admin promotion (see doc 13's Contributor Application System section).

```sql
contributor_applications
├── id                        UUID PRIMARY KEY DEFAULT gen_random_uuid()
├── user_id                   UUID REFERENCES users(id) ON DELETE CASCADE
├── status                    VARCHAR(20) DEFAULT 'pending'
│                              -- pending | approved | rejected | needs_revision | withdrawn
├── full_name                 TEXT NOT NULL
├── profession                 TEXT NOT NULL
├── organization                TEXT NOT NULL
├── country                     TEXT NOT NULL
├── bio                       TEXT NOT NULL
├── expertise                 TEXT NOT NULL              -- area of expertise, free text
├── experience                TEXT NOT NULL
├── motivation                TEXT NOT NULL              -- "why do you want to contribute"
├── sample_works               TEXT                       -- description / links, optional
├── sample_file_urls           TEXT[]                     -- R2 object keys
├── supporting_document_urls   TEXT[]                     -- R2 object keys, optional
├── profile_snapshot           JSONB NOT NULL             -- immutable copy of the applicant's
│                                                            profile links (github/kaggle/hf/
│                                                            scholar/linkedin/website/orcid/x)
│                                                            as of submission — what the
│                                                            reviewer actually saw
├── reviewer_id                UUID REFERENCES users(id)
├── review_notes                TEXT                      -- internal only, never applicant-visible
├── feedback_to_applicant        TEXT                     -- shown to the applicant
├── reviewed_at                    TIMESTAMPTZ
├── submitted_at                    TIMESTAMPTZ DEFAULT NOW()
├── created_at                      TIMESTAMPTZ DEFAULT NOW()
└── updated_at                      TIMESTAMPTZ DEFAULT NOW()
```

The canonical, editable profile-link values live on `users` (see table 1); `profile_snapshot`
is a point-in-time copy taken at submission so a later profile edit can't retroactively
change what a reviewer's decision was based on.

The admin review page and the applicant's own status page both also surface every other
`contributor_applications` row for the same `user_id` (most recent first) as an application
history/timeline — no separate history table, just a query excluding the current row.

Contribution stats and quality indicators shown in the admin review panel (total submitted/
approved/rejected, approval rate, profile completeness, resource diversity) are computed
on read from the existing `resources`/`reputation_events`/`users` tables — no dedicated
metrics table exists. Metrics with no automated backing yet (contribution quality score,
documentation/metadata quality, license compliance) are returned as explicit placeholders,
not stored or faked.

---

### 22. `resource_files`

Added for Phase 2.3 (Resource Management & File Experience) — universal multi-file
attachments for every resource type, additive on top of the single-slot fields above
(`datasets.file_url`, `papers.pdf_url`, `tools.file_url`, `resources.thumbnail_url`/
`documentation_url`), which are unchanged and still work exactly as before. Tutorial/
prompt/project/news resources, which have no single-slot file field at all, get 100% of
their file support through this table.

```sql
resource_files
├── id               UUID PRIMARY KEY DEFAULT gen_random_uuid()
├── resource_id      UUID REFERENCES resources(id) ON DELETE CASCADE
├── storage_key      TEXT NOT NULL              -- R2 object key, never exposed to clients
├── display_name     VARCHAR(255) NOT NULL      -- editable label; defaults to filename
├── filename         VARCHAR(255) NOT NULL      -- original uploaded filename
├── mime_type        VARCHAR(150) NOT NULL
├── extension        VARCHAR(20) NOT NULL
├── size_bytes       BIGINT NOT NULL
├── checksum_sha256  VARCHAR(64) NOT NULL
├── sort_order       INTEGER DEFAULT 0
├── uploaded_by       UUID REFERENCES users(id) ON DELETE SET NULL
└── uploaded_at        TIMESTAMPTZ DEFAULT NOW()
```

Allowed extensions and max size are enforced per resource `type`, not globally:

| Type | Extensions | Max size |
|------|-----------|----------|
| dataset | csv, json, parquet, zip, tar, gz | 500MB |
| paper | pdf | 50MB |
| tool | zip, 7z, tar, gz | 200MB |
| tutorial | pdf, docx, pptx, zip, md | 100MB |
| prompt | txt, json, md, pdf | 10MB |
| project | zip, pdf, docx, pptx | 200MB |
| news | pdf, jpg, jpeg, png | 20MB |

Deleting a resource deletes its `resource_files` rows (`ON DELETE CASCADE`) and their R2
objects; deleting a single attachment removes both the row and the R2 object immediately.

### 23. `search_logs`

Added for Phase 3B (Discovery System) — powers "popular searches" and the admin
search-analytics view. Written fire-and-forget on every `GET /search` call, same
best-effort pattern already used for MeiliSearch index sync (never blocks or fails
the search itself).

```sql
search_logs
├── id            UUID PRIMARY KEY DEFAULT gen_random_uuid()
├── query         VARCHAR(300) NOT NULL
├── result_count  INTEGER NOT NULL
├── filters       JSONB                      -- type/category/language/license/tags/etc. applied
├── user_id       UUID REFERENCES users(id) ON DELETE SET NULL  -- null for anonymous search
└── created_at    TIMESTAMPTZ DEFAULT NOW()
```

"Popular searches" = `query` grouped and counted within a recent window (default 7 days).
No-result searches (for the admin view) are simply rows where `result_count = 0`.

---

### 24. `follows` (Phase 4B — mirrors `bookmarks`' shape exactly, hard delete)

```sql
follows
├── id            UUID PRIMARY KEY DEFAULT gen_random_uuid()
├── follower_id   UUID REFERENCES users(id) ON DELETE CASCADE
├── following_id  UUID REFERENCES users(id) ON DELETE CASCADE
├── created_at    TIMESTAMPTZ DEFAULT NOW()
└── UNIQUE (follower_id, following_id)
```
No-self-follow is an app-layer check (no schema-level constraint), same precedent as
"can't review your own resource" in `reviews`.

### 25. `pinned_resources` (Phase 4B — max 6 per user, enforced in the service layer)

```sql
pinned_resources
├── id            UUID PRIMARY KEY DEFAULT gen_random_uuid()
├── user_id       UUID REFERENCES users(id) ON DELETE CASCADE
├── resource_id   UUID REFERENCES resources(id) ON DELETE CASCADE
├── position      INTEGER NOT NULL
├── created_at    TIMESTAMPTZ DEFAULT NOW()
└── UNIQUE (user_id, resource_id)
```

### 26. `activities` (Phase 4B — dual-write activity ledger)

```sql
activities
├── id            UUID PRIMARY KEY DEFAULT gen_random_uuid()
├── user_id       UUID REFERENCES users(id) ON DELETE CASCADE
├── type          VARCHAR(50) NOT NULL   -- open string, same convention as reputation_events.event_type
│                 -- resource_uploaded | resource_approved | review_written | review_received
│                 -- comment_added | reply_added | badge_received | level_up
│                 -- started_following | prompt_forked | model_uploaded | like_received
├── target_type   VARCHAR(50)
├── target_id     UUID
├── metadata      JSONB
└── created_at    TIMESTAMPTZ DEFAULT NOW()
```
Written alongside the real side-effect (same pattern as `reputation_events` — never derived
via a live UNION query across resources/reviews/comments). Doubles as the source for the
public activity timeline AND the contribution heatmap (grouped by day) — no separate
heatmap table.

### 27. `badges` / `user_badges` (Phase 4B — catalog + award join)

```sql
badges
├── id            SERIAL PRIMARY KEY
├── key           VARCHAR(50) UNIQUE NOT NULL   -- e.g. verified_contributor, top_reviewer
├── name          VARCHAR(100) NOT NULL
├── description   TEXT NOT NULL
├── icon          VARCHAR(50) NOT NULL          -- lucide-react icon name
└── created_at    TIMESTAMPTZ DEFAULT NOW()

user_badges
├── id            UUID PRIMARY KEY DEFAULT gen_random_uuid()
├── user_id       UUID REFERENCES users(id) ON DELETE CASCADE
├── badge_id      INTEGER REFERENCES badges(id) ON DELETE CASCADE
├── awarded_by    UUID REFERENCES users(id) ON DELETE SET NULL  -- NULL = auto-awarded
├── awarded_at    TIMESTAMPTZ DEFAULT NOW()
└── UNIQUE (user_id, badge_id)
```
Auto-award checks run in `BadgeService.checkAndAwardMilestones()` after reputation/review/
comment/resource-approval events — see `project-planning`/backend `scripts/seed.ts` for the
seeded catalog. "Contributor Level" is **not** a stored column — it's computed from
`reputation_score` via `backend/src/utils/contributorLevel.ts` (mirrors the frontend's
`ReputationBadge.tsx` tier thresholds), avoiding a duplicated/stale leveling concept.

### 28. `user_analytics` (Phase 4B — mirrors `resource_analytics`, FK flipped to `users`)

```sql
user_analytics
├── id                UUID PRIMARY KEY DEFAULT gen_random_uuid()
├── profile_user_id   UUID REFERENCES users(id) ON DELETE CASCADE   -- whose profile
├── event_type        VARCHAR(30) NOT NULL
│                     -- profile_view | profile_share | follow | unfollow
│                     -- pinned_resource_click | social_link_click
├── viewer_id         UUID REFERENCES users(id) ON DELETE SET NULL  -- NULL for anonymous
├── ip_address        INET
├── referrer          TEXT
└── created_at        TIMESTAMPTZ DEFAULT NOW()
```
Kept as its own table rather than a nullable `resource_id` on `resource_analytics`, since
profile events aren't resource-scoped and that FK/cascade semantics wouldn't apply.

### 29. `feed_interactions` (Phase 4D — Intelligent Feed, per-user seen/negative-signal state)

```sql
feed_interactions
├── id                UUID PRIMARY KEY DEFAULT gen_random_uuid()
├── user_id           UUID REFERENCES users(id) ON DELETE CASCADE
├── resource_id       UUID REFERENCES resources(id) ON DELETE CASCADE  -- NULL for contributor/category mutes
├── contributor_id    UUID REFERENCES users(id) ON DELETE CASCADE      -- set for mute_contributor
├── category_id       INTEGER REFERENCES categories(id) ON DELETE CASCADE  -- set for mute_category
├── target_key        VARCHAR NOT NULL   -- resource_id | contributor_id | category_id, whichever is set
│                     -- (mirrors activities.target_id's polymorphic-string precedent; needed because a
│                     -- unique index across three mutually-exclusive nullable FKs wouldn't dedupe, since
│                     -- Postgres treats NULL as distinct from NULL)
├── type              VARCHAR NOT NULL   -- impression | click | hide | mute_contributor | mute_category | not_interested
├── impression_count  INTEGER DEFAULT 0  -- upsert-incremented, not one row per view
├── revoked_at        TIMESTAMPTZ        -- soft-delete for "undo hide/mute"
├── created_at        TIMESTAMPTZ DEFAULT NOW()
├── updated_at        TIMESTAMPTZ
└── UNIQUE (user_id, type, target_key)
```
A **state table, not an event log** — deliberately not an `AnalyticsEventType` extension on
`resource_analytics`. Impressions are extremely high-write (every card render), while
`resource_analytics` is already full-scanned by `resolveTrendingPage`'s trending-score query;
mixing an impression firehose into that table would degrade it. Feed ranking also needs
per-(user, resource) *state* (seen count, last seen, hidden flag) for anti-repetition scoring
and fast negative-signal existence checks, which a log table handles poorly.

### 30. `feed_pins` (Phase 4D — admin-curated Featured / Editor's Picks)

```sql
feed_pins
├── id            UUID PRIMARY KEY DEFAULT gen_random_uuid()
├── resource_id   UUID REFERENCES resources(id) ON DELETE CASCADE
├── pin_type      VARCHAR NOT NULL   -- featured | editors_pick
├── position      INTEGER NOT NULL
├── pinned_by     UUID REFERENCES users(id)
├── note          TEXT               -- optional curator caption shown on the card
├── starts_at     TIMESTAMPTZ
├── ends_at       TIMESTAMPTZ
├── created_at    TIMESTAMPTZ DEFAULT NOW()
└── UNIQUE (resource_id, pin_type)
```
Modeled on `pinned_resources` but scoped to admin curation, with a type discriminator and
optional scheduling window so Editor's Picks can rotate weekly without deleting/recreating
rows. `featured`/`editors_pick` are independent pin types on the same resource, not a
DB-enforced subset relationship — the admin UI can pin a resource as both. Distinct from
`resources.featured` (the existing general-purpose flag used elsewhere, e.g. resource detail
badges) — this table is specifically feed placement with ordering.

### 31. `feed_announcements` (Phase 4D — admin platform-wide messages surfaced as feed cards)

```sql
feed_announcements
├── id            UUID PRIMARY KEY DEFAULT gen_random_uuid()
├── title         VARCHAR(200) NOT NULL
├── body          TEXT NOT NULL
├── image_url     TEXT   -- banner image: R2 object key or a pasted http(s) URL,
│                 -- resolved via StorageService.resolveUrl() same as resources.thumbnail_url.
│                 -- Distinct from link_url below — this is the image, not the click-through target.
├── link_url      TEXT
├── created_by    UUID REFERENCES users(id)
├── is_active     BOOLEAN DEFAULT true
├── starts_at     TIMESTAMPTZ
├── ends_at       TIMESTAMPTZ
├── created_at    TIMESTAMPTZ DEFAULT NOW()
└── updated_at    TIMESTAMPTZ
```

**Feed weight/config storage**: no new table — reuses `platform_settings` (table #18's sibling,
see `PlatformSetting` in the schema) with `key = 'feed_config'`, a single JSON blob shaped
`{ weights: {...}, diversity: { maxPerContributor, maxPerCategory, maxPerType, discoveryRatio },
enabledCardTypes: [...] }`. Mirrors the existing `require_manual_approval` key exactly — no
relational structure needed since it's read wholesale into JS, and `updated_at`/`updated_by`
already give an audit trail.

**No new tables for the rest of the feed's card types** — they read directly from existing
tables: resource published/updated (`resources.published_at`/`updated_at`), follow-based
activity (`follows` + `activities`), badges/milestones (`user_badges`/`reputation_events`),
trending (existing `resolveTrendingPage` scoring, extended), comment highlights (`comments` +
`comment_likes`).

**Explicitly out of scope**: Collections, Events, and Sponsored Content have no backing tables —
`feed_card_type` reserves `collection_shared` / `event_upcoming` / `sponsored_content` enum
values for future work only.

### 32. `conversations` / `messages` / `user_blocks` (Phase 4F — 1-on-1 direct messaging)

```sql
conversations
├── id                    UUID PRIMARY KEY DEFAULT gen_random_uuid()
├── participant_one_id    UUID REFERENCES users(id) ON DELETE CASCADE  -- canonically the
├── participant_two_id    UUID REFERENCES users(id) ON DELETE CASCADE  -- lexicographically smaller UUID
├── last_message_at       TIMESTAMPTZ
├── created_at            TIMESTAMPTZ DEFAULT NOW()
└── UNIQUE (participant_one_id, participant_two_id)

messages
├── id               UUID PRIMARY KEY DEFAULT gen_random_uuid()
├── conversation_id  UUID REFERENCES conversations(id) ON DELETE CASCADE
├── sender_id        UUID REFERENCES users(id)          -- nullable: SET NULL if the sender is deleted,
│                                                        -- preserving the thread instead of cascading it away
├── content          VARCHAR(2000) NOT NULL
├── read_at          TIMESTAMPTZ
└── created_at       TIMESTAMPTZ DEFAULT NOW()

user_blocks
├── id           UUID PRIMARY KEY DEFAULT gen_random_uuid()
├── blocker_id   UUID REFERENCES users(id) ON DELETE CASCADE
├── blocked_id   UUID REFERENCES users(id) ON DELETE CASCADE
├── created_at   TIMESTAMPTZ DEFAULT NOW()
└── UNIQUE (blocker_id, blocked_id)
```
Polling-based, not WebSocket (no realtime infra in this stack) — the frontend polls
`GET /messages/unread-count` globally and `GET /messages/conversations/:id/messages` while a
thread is open. `conversations`' canonical participant ordering (participant_one_id always the
lexicographically smaller UUID) means `getOrCreateConversation` is a single `upsert` on the
unique pair — no need to check both (A,B) and (B,A). Any logged-in user can message any other
(no follow requirement), with `user_blocks` as the abuse control: a block is checked in both
directions before a message send succeeds, plus a 60/hour/user rate limit. New messages notify
via the existing `notifications` table (`new_message` type, `messages` preference category).

---

## Indexes

```sql
-- Slug lookups (very frequent)
CREATE UNIQUE INDEX idx_resources_slug ON resources(slug);
CREATE UNIQUE INDEX idx_users_username ON users(username);
CREATE UNIQUE INDEX idx_categories_slug ON categories(slug);

-- Status filter (admin panel)
CREATE INDEX idx_resources_status ON resources(status);
CREATE INDEX idx_resources_type ON resources(type);

-- Author's resources
CREATE INDEX idx_resources_author ON resources(author_id);

-- Soft delete filter
CREATE INDEX idx_resources_deleted ON resources(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_deleted ON users(deleted_at) WHERE deleted_at IS NULL;

-- Reputation events for user
CREATE INDEX idx_reputation_user ON reputation_events(user_id);

-- Notifications for user
CREATE INDEX idx_notifications_user ON notifications(user_id, is_read);

-- Audit logs by actor and target
CREATE INDEX idx_audit_actor ON audit_logs(actor_id);
CREATE INDEX idx_audit_target ON audit_logs(target_type, target_id);

-- Contributor applications: applicant's own applications + admin review queue
CREATE INDEX idx_contributor_applications_user ON contributor_applications(user_id);
CREATE INDEX idx_contributor_applications_status ON contributor_applications(status);
```

---

## MeiliSearch Index Structure

Database-এ সব data থাকবে, কিন্তু search MeiliSearch দিয়ে হবে। নিচের fields index করা হবে:

```json
{
  "indexName": "resources",
  "primaryKey": "id",
  "searchableAttributes": [
    "title",
    "description",
    "tags",
    "author_name",
    "category_name"
  ],
  "filterableAttributes": [
    "type",
    "status",
    "language",
    "category_id",
    "license"
  ],
  "sortableAttributes": [
    "view_count",
    "download_count",
    "bookmark_count",
    "published_at",
    "created_at"
  ]
}
```

---

## Migration Strategy

```
migrations/
├── 001_create_users.sql
├── 002_create_roles_permissions.sql
├── 003_create_resources.sql
├── 004_create_datasets.sql
├── 005_create_papers.sql
├── 006_create_tools.sql
├── 007_create_categories_tags.sql
├── 008_create_social.sql           -- bookmarks, comments, reports
├── 009_create_notifications.sql
├── 010_create_reputation.sql
├── 011_create_audit.sql
├── 012_create_auth_tokens.sql
├── 013_create_analytics.sql
└── 014_create_indexes.sql
```

> In practice, the backend uses Prisma-generated, timestamp-named migrations under
> `backend/prisma/migrations/` rather than this hand-numbered scheme (e.g. `20260706120000_init`).
> The Contributor Application System (table 21, plus the new `users` columns) shipped as
> `20260707000000_add_contributor_applications`; the `profession`/`organization`/`country`
> columns followed as `20260707010000_add_contributor_application_profile_details`.

---

*Document 10 of 14 — Bangla AI Hub Project Planning*
