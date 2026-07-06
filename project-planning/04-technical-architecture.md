# Bangla AI Hub — Technical Architecture Blueprint
**Document:** 04  
**Version:** 2.0  
**Status:** Finalized — Stack Decided  
**Date:** July 2026  
**Last Updated:** July 2026 — Final stack decision confirmed

---

## ✅ Final Stack Decision (Decided July 2026)

এটি চূড়ান্ত সিদ্ধান্ত। আর পরিবর্তন হবে না যদি না বড় কোনো কারণ না থাকে।

| Layer | Tool | Role |
|-------|------|------|
| **Frontend** | Next.js | UI framework |
| **Frontend Hosting** | Vercel | Frontend deploy করার জায়গা |
| **Backend** | Custom (Node.js + Express.js) | নিজে build করা backend |
| **Backend Hosting** | Render | Backend deploy করার জায়গা |
| **Database** | Supabase (PostgreSQL) | শুধু database — cloud-hosted PostgreSQL |
| **Search** | MeiliSearch | Full-text + fuzzy search |
| **File Storage** | Cloudflare R2 | Dataset ও file storage |
| **Email** | Resend | Transactional email |
| **CDN** | Cloudflare | Static assets ও caching |

> **গুরুত্বপূর্ণ:** Supabase এখানে শুধু **PostgreSQL database** হিসেবে ব্যবহার হবে।  
> Supabase Auth, Supabase Edge Functions, Supabase Storage — এগুলো **ব্যবহার হবে না**।  
> সব auth, business logic, এবং API আমাদের নিজের backend এ থাকবে।

---

## Architecture Philosophy

**Principle 1: Start Simple, Scale Smart**
We do not need microservices on Day 1. Start with a monolith that can be modularized later. Over-engineering kills early-stage projects.

**Principle 2: Open Source First**
Prefer open-source tools where they meet quality requirements. Reduces cost and aligns with our mission.

**Principle 3: API-First Design**
Everything built internally should be exposable as an API. This enables the community to build on top of us.

**Principle 4: Bangla-Ready by Default**
Every text field, every search index, every content system must handle Unicode Bangla text correctly from Day 1. Retrofitting Bangla support is extremely painful.

**Principle 5: Mobile-First Performance**
Design for slow connections and mobile browsers first. Desktop is an enhancement, not the baseline.

---

## System Overview

```
┌──────────────────────────────────────────────────────┐
│                      Users                            │
│         (Browser / Mobile App / API Clients)          │
└────────────────────────┬─────────────────────────────┘
                         │
┌────────────────────────▼─────────────────────────────┐
│                 Cloudflare CDN                        │
│            (Static assets, caching, DDoS)             │
└────────────────────────┬─────────────────────────────┘
                         │
┌────────────────────────▼─────────────────────────────┐
│              Frontend — Next.js                       │
│              Hosted on: VERCEL                        │
│        (SSR + Static Generation + API Routes)         │
└────────────────────────┬─────────────────────────────┘
                         │  HTTP API calls
┌────────────────────────▼─────────────────────────────┐
│            Custom Backend — Node.js + Express         │
│                 Hosted on: RENDER                     │
│     Auth | Resources | Community | Search | Admin     │
└────┬───────────────────┬──────────────────┬───────────┘
     │                   │                  │
┌────▼─────────┐  ┌──────▼──────┐  ┌───────▼────────┐
│  Supabase    │  │ MeiliSearch │  │ Cloudflare R2  │
│  PostgreSQL  │  │   (Search)  │  │ (File Storage) │
│  (Cloud DB)  │  │             │  │                │
│  AWS-hosted  │  │             │  │                │
└──────────────┘  └─────────────┘  └────────────────┘
```

### কোন layer কোথায় চলে

| Layer | Platform | Notes |
|-------|----------|-------|
| Frontend (Next.js) | Vercel | Free tier দিয়ে শুরু |
| Backend (Express.js) | Render | Free tier — cold start আছে, Phase 1 তে সমস্যা নেই |
| Database (PostgreSQL) | Supabase | Cloud-hosted, AWS এ, সবসময় চালু |
| Search | MeiliSearch | Render বা Railway তে host করবো |
| File Storage | Cloudflare R2 | S3-compatible, সস্তা |

---

## Technology Stack

### Frontend

| Component | Choice | Reason |
|-----------|--------|--------|
| Framework | Next.js 14+ | SSR, SEO, React ecosystem |
| Language | TypeScript | Type safety, team scalability |
| Styling | Tailwind CSS | Fast development, consistent UI |
| UI Components | shadcn/ui | Accessible, customizable |
| State | Zustand / React Query | Simple and effective |
| i18n | next-intl | Bangla + English support |

### Backend

| Component | Choice | Reason |
|-----------|--------|--------|
| Runtime | Node.js | JavaScript ecosystem, frontend এর সাথে একই ভাষা |
| Framework | Express.js | Mature, simple, ভালোভাবে documented |
| Language | TypeScript | Type safety, bug কম হয় |
| Auth | Custom JWT | নিজের backend এ নিজে handle করবো (Supabase Auth না) |
| Validation | Zod | Schema validation |
| ORM | Prisma | Type-safe database queries, PostgreSQL এর সাথে সহজ |

### Database

| Component | Choice | Reason |
|-----------|--------|--------|
| Primary DB | **Supabase (PostgreSQL only)** | Cloud-hosted PostgreSQL — শুধু DB হিসেবে ব্যবহার |
| Search | MeiliSearch | Fast, open-source, Bangla-compatible |
| Cache | Redis (Phase 2 তে) | Phase 1 তে দরকার নেই |
| File Storage | Cloudflare R2 | S3-compatible, সস্তা, Supabase Storage না |

> ⚠️ **Supabase ব্যবহারের সীমানা:**
> - ✅ ব্যবহার করবো: PostgreSQL database (connection string দিয়ে)
> - ❌ ব্যবহার করবো না: Supabase Auth
> - ❌ ব্যবহার করবো না: Supabase Storage  
> - ❌ ব্যবহার করবো না: Supabase Edge Functions
> - ❌ ব্যবহার করবো না: Supabase Realtime

### Infrastructure

| Component | Choice | Reason |
|-----------|--------|--------|
| Frontend Hosting | **Vercel** | Next.js এর জন্য best, free tier আছে |
| Backend Hosting | **Render** | Backend deploy এর জন্য, free tier আছে |
| Database | **Supabase** | PostgreSQL cloud hosting, free tier = 500MB |
| CDN | Cloudflare | Free tier, excellent performance |
| CI/CD | GitHub Actions | Integrated, free tier |
| Monitoring | Sentry (errors) + Plausible (analytics) | Open-source friendly |
| Email | Resend | Reliable transactional email, সস্তা |

---

## Local Development Setup

Local এ কাজ করার সময় database **সবসময় Supabase cloud** এ থাকবে। আলাদা local database setup করার দরকার নেই।

### কিভাবে connect করবো

Supabase dashboard থেকে **connection string** নিয়ে `.env` file এ রাখবো:

```env
# .env.local (এই file কখনো git এ push করবো না)

# Supabase PostgreSQL connection string
DATABASE_URL="postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres"

# Backend server
PORT=3001
NODE_ENV=development

# JWT secret
JWT_SECRET="your-secret-key-here"

# Frontend URL (CORS এর জন্য)
FRONTEND_URL="http://localhost:3000"
```

### Flow

```
Local Machine (আমার laptop)
│
├── Frontend: localhost:3000  →  Next.js dev server
│
├── Backend:  localhost:3001  →  Express.js dev server
│                                     │
│                                     │ DATABASE_URL connection string
│                                     ▼
│                              Supabase Cloud (AWS)
│                              PostgreSQL Database
│                              [সবসময় cloud এ — কোনো local DB নেই]
│
└── Search:   localhost:7700  →  MeiliSearch local instance
```

### Deploy করার সময় কী হয়

| Environment | Frontend | Backend | Database |
|-------------|----------|---------|----------|
| Local Dev | localhost:3000 | localhost:3001 | Supabase Cloud (same) |
| Production | Vercel | Render | Supabase Cloud (same) |

**Database কোথাও move করতে হয় না।** Local এও Supabase, production এও Supabase। শুধু frontend আর backend এর hosting বদলায়।

### .gitignore তে অবশ্যই রাখতে হবে

```
.env
.env.local
.env.production
```

---

## Data Models (Core)

### User
```
User {
  id            UUID
  email         String (unique)
  username      String (unique)
  displayName   String
  bio           Text
  avatarUrl     String
  role          Enum (visitor/member/contributor/verified/admin)
  createdAt     DateTime
  reputation    Integer
  
  // Relations
  resources     Resource[]
  discussions   Discussion[]
  profile       Profile
}
```

### Resource (Core entity — datasets, papers, tools, prompts, tutorials)
```
Resource {
  id            UUID
  title         String
  titleBn       String          // Bangla title
  description   Text
  descriptionBn Text            // Bangla description
  type          Enum (dataset/paper/tool/prompt/tutorial/project/ui_kit)
  url           String
  fileUrl       String?         // For hosted files
  license       String
  language      String[]        // ["bn", "en"]
  tags          String[]
  status        Enum (pending/approved/rejected)
  qualityScore  Float?
  
  // Metadata
  authorId      UUID
  createdAt     DateTime
  updatedAt     DateTime
  publishedAt   DateTime?
  
  // Stats
  viewCount     Integer
  downloadCount Integer
  bookmarkCount Integer
  
  // Relations
  categories    Category[]
  comments      Comment[]
  reviews       Review[]
  versions      ResourceVersion[]  // For datasets
}
```

### Dataset (extends Resource)
```
Dataset {
  resourceId    UUID (FK)
  size          String          // "1.2GB"
  formatTypes   String[]        // ["csv", "json"]
  recordCount   Integer?
  language      String          // "bn" / "bn-BD"
  domainArea    String          // "NER", "sentiment", etc.
  dataSource    String
  collectionMethod String
  lastUpdated   DateTime
  
  versions      DatasetVersion[]
}
```

### Community Discussion
```
Discussion {
  id            UUID
  title         String
  body          Text
  type          Enum (question/discussion/announcement/showcase)
  authorId      UUID
  categoryId    UUID
  isPinned      Boolean
  isSolved      Boolean?        // For questions
  
  createdAt     DateTime
  viewCount     Integer
  upvoteCount   Integer
  
  replies       Reply[]
}
```

---

## Search Architecture

Search is the most critical feature. Users must find what they need quickly.

### Search Tiers

**Tier 1: Exact Match**
- Search by title, author, tags
- PostgreSQL full-text search
- Good for known queries

**Tier 2: Fuzzy Search**
- Handles typos and partial matches
- MeiliSearch / Typesense
- Good for exploration

**Tier 3: Semantic Search (Year 2)**
- Embedding-based similarity search
- pgvector extension on PostgreSQL
- "Find resources similar to this dataset"

### Bangla Search Requirements
- Unicode normalization for Bangla text
- Handle both ব and its variants
- Support mixed Bangla-English queries
- Handle transliteration (romanized Bangla input)

---

## API Design

### REST API Structure
```
/api/v1/
  /resources
    GET    /           - List resources (filterable)
    POST   /           - Create resource
    GET    /:id        - Get single resource
    PUT    /:id        - Update resource
    DELETE /:id        - Delete resource
    
  /datasets
    GET    /           - List datasets
    GET    /:id        - Get dataset details
    GET    /:id/download - Download dataset
    
  /users
    GET    /me         - Current user
    PUT    /me         - Update profile
    GET    /:username  - Public profile
    
  /community
    GET    /discussions
    POST   /discussions
    GET    /discussions/:id
    POST   /discussions/:id/replies
    
  /search
    GET    /           - Search all resources
    GET    /datasets   - Search datasets only
    GET    /papers     - Search papers only
```

### Authentication
- JWT tokens (short-lived access + refresh tokens)
- OAuth providers: Google, GitHub
- Email/password with verification
- Rate limiting per user and IP

---

## Security Architecture

| Risk | Mitigation |
|------|-----------|
| SQL Injection | Parameterized queries (Prisma ORM) |
| XSS | Content Security Policy + sanitization |
| CSRF | SameSite cookies + CSRF tokens |
| Unauthorized access | Role-based access control (RBAC) |
| Data exposure | Row-level security in PostgreSQL |
| DDoS | Cloudflare protection |
| File upload abuse | Type validation + size limits + virus scan |
| Spam | Rate limiting + CAPTCHA on forms |

---

## Bangla Language Technical Requirements

### Must Handle
- Unicode Bangla (UTF-8): ক খ গ ঘ ঙ চ ছ জ ঝ ঞ...
- Bengali numerals: ০ ১ ২ ৩ ৪ ৫ ৬ ৭ ৮ ৯
- Common punctuation and diacritics
- Mixed Bangla-English text
- Transliterated Bangla (romon lekha)
- Sorting/collation order in Bangla

### Database Configuration
- PostgreSQL with `utf8` encoding
- Bangla full-text search dictionary
- Unicode-aware string comparison

### Frontend
- Bangla fonts: Noto Sans Bengali, Hind Siliguri
- RTL-aware layout (Bangla is LTR but test with RTL neighbors)
- Keyboard input support for Bangla

---

## Scalability Plan

### Phase 1 — 0 to ~500 users (Free tier)
- Frontend: Vercel free tier
- Backend: Render free tier (cold start আছে, ঠিক আছে)
- Database: Supabase free tier (500MB, 50K users)
- Search: MeiliSearch on Render free tier
- **Cost: $0/month**

### Phase 2 — 500 to 10K users (~$25-50/month)
- Supabase Pro plan: $25/month (8GB DB, daily backups, no cold start)
- Render Starter: $7/month (backend always-on, no cold start)
- Vercel Pro: free tier তে যথেষ্ট হওয়ার কথা
- **Cost: ~$32-50/month**

### Phase 3 — 10K to 100K users (~$150-300/month)
- Supabase Pro + read replicas
- Render Standard tier for backend
- Redis for caching (Upstash — usage-based, সস্তা)
- Dedicated MeiliSearch instance
- **Cost: ~$150-300/month**

### Phase 4 — 100K+ users
- Horizontal scaling for backend
- Database sharding বা connection pooling (PgBouncer)
- Multi-region consideration
- Cost: Revenue দিয়ে cover করবো

### Year 3+ (100K+ users)
- Horizontal scaling for app servers
- Database sharding strategy
- Microservices for high-load components (search, file storage)
- Multi-region for Southeast Asia + Europe
- Cost: Variable, covered by revenue

---

## Development Workflow

### Branching Strategy
```
main (production)
  └── develop (staging)
        └── feature/xxx
        └── fix/xxx
        └── chore/xxx
```

### Quality Gates
- TypeScript strict mode
- ESLint + Prettier (enforced in CI)
- Unit tests for business logic (Jest)
- Integration tests for API (Supertest)
- E2E tests for critical flows (Playwright)
- No merge without review

### Deployment
- Feature branch → develop → staging review → main → production
- GitHub Actions for CI/CD
- Zero-downtime deployments
- Automated database migrations
- Rollback capability within 5 minutes

---

---

## Cost Summary (Phase 1 থেকে শুরু)

| Service | Free Tier Limit | Phase 1 Cost |
|---------|----------------|-------------|
| Vercel (Frontend) | 100GB bandwidth/month | $0 |
| Render (Backend) | 750 hours/month | $0 |
| Supabase (PostgreSQL) | 500MB DB, 50K users | $0 |
| Cloudflare (CDN) | Unlimited | $0 |
| GitHub Actions (CI/CD) | 2000 min/month | $0 |
| **Total Phase 1** | | **$0/month** |

Domain name ($10-15/year) ছাড়া সবকিছু free তে চলবে যতক্ষণ না 500 জন user হয়।

---

*Document 04 of 09 — Bangla AI Hub Project Planning*  
*Version 2.0 — Stack finalized July 2026*
