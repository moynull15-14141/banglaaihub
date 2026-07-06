# Bangla AI Hub — Database Design
**Document:** 10  
**Version:** 1.0  
**Status:** Foundation Draft  
**Date:** July 2026

---

## Design Principles

1. **Universal Resource Schema** — সব resource type (dataset, paper, tool, tutorial) একটি common base থেকে extend করবে
2. **Soft Delete** — কোনো data hard delete হবে না, `deleted_at` timestamp ব্যবহার করবো
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
├── website_url      TEXT
├── github_url       TEXT
├── scholar_url      TEXT                -- Google Scholar
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

---

### 6. `resources` (Universal Base — সব resource এখানে)

```sql
resources
├── id               UUID PRIMARY KEY DEFAULT gen_random_uuid()
├── slug             VARCHAR(200) UNIQUE NOT NULL  -- bangla-sentiment-dataset-v2
├── title            VARCHAR(300) NOT NULL
├── description      TEXT
├── type             VARCHAR(50) NOT NULL
│                    -- dataset | paper | tool | tutorial | prompt | project | news
├── category_id      INTEGER REFERENCES categories(id)
├── author_id        UUID REFERENCES users(id)
├── status           VARCHAR(20) DEFAULT 'pending'
│                    -- pending | approved | rejected | flagged
├── visibility       VARCHAR(20) DEFAULT 'public'
│                    -- public | unlisted | private
├── language         VARCHAR(10) DEFAULT 'bn'  -- ISO 639: bn, en, both
├── thumbnail_url    TEXT
├── external_url     TEXT                       -- GitHub, HuggingFace, etc.
├── license          VARCHAR(100)               -- MIT, CC-BY-4.0, etc.
├── view_count       INTEGER DEFAULT 0
├── download_count   INTEGER DEFAULT 0
├── bookmark_count   INTEGER DEFAULT 0
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

### 9. `tools` (extends resources — tools, tutorials, prompts)

```sql
tools
├── id               UUID PRIMARY KEY DEFAULT gen_random_uuid()
├── resource_id      UUID UNIQUE REFERENCES resources(id) ON DELETE CASCADE
├── tool_type        VARCHAR(50)               -- library | api | model | prompt | tutorial
├── platform         VARCHAR(100)              -- Python, JavaScript, HuggingFace
├── demo_url         TEXT
├── install_command  TEXT
├── created_at       TIMESTAMPTZ DEFAULT NOW()
└── updated_at       TIMESTAMPTZ DEFAULT NOW()
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
├── status           VARCHAR(20) DEFAULT 'visible'  -- visible | hidden | deleted
├── created_at       TIMESTAMPTZ DEFAULT NOW()
├── updated_at       TIMESTAMPTZ DEFAULT NOW()
└── deleted_at       TIMESTAMPTZ
```

### 15. `reports`

```sql
reports
├── id               UUID PRIMARY KEY DEFAULT gen_random_uuid()
├── reporter_id      UUID REFERENCES users(id)
├── resource_id      UUID REFERENCES resources(id)
├── reason           VARCHAR(50) NOT NULL
│                    -- spam | copyright | wrong_data | duplicate | inappropriate
├── description      TEXT
├── status           VARCHAR(20) DEFAULT 'pending'  -- pending | reviewed | resolved | dismissed
├── reviewed_by      UUID REFERENCES users(id)
├── reviewed_at      TIMESTAMPTZ
├── created_at       TIMESTAMPTZ DEFAULT NOW()
└── updated_at       TIMESTAMPTZ DEFAULT NOW()
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
├── user_id          UUID REFERENCES users(id)      -- NULL for anonymous
├── ip_address       INET
├── referrer         TEXT
└── created_at       TIMESTAMPTZ DEFAULT NOW()
```

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

---

*Document 10 of 14 — Bangla AI Hub Project Planning*
