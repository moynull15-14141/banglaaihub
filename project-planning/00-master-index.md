# Bangla AI Hub — Master Project Index
**Version:** 2.0  
**Status:** Active Development  
**Started:** July 2026  
**Founder:** MH Pollob

---

## What Is This Folder?

This folder contains every planning, strategy, and blueprint document for Bangla AI Hub.
Every major decision must be traceable back to a document in this folder.

---

## Document Map

| # | Document | Purpose | Status |
|---|----------|---------|--------|
| 01 | Foundation Book (Complete) | Identity, Mission, Vision, Values | ✅ Complete |
| 02 | Product Vision & Scope | What we are building and why | ✅ Complete |
| 03 | 5-Year Roadmap | When we build what | ✅ Complete |
| 04 | Technical Architecture | How we build it | ✅ Complete |
| 05 | Business Model | How we sustain it | ✅ Complete |
| 06 | Community Strategy | How we grow the community | ✅ Complete |
| 07 | Go-to-Market Strategy | How we launch | ✅ Complete |
| 08 | Dataset Acceptance Policy | What datasets we accept, how, and why | ✅ Complete |
| 09 | Risk Analysis & Contingency Plans | What if things go wrong — Plan B for every risk | ✅ Complete |
| 10 | Database Design | Database schema, ER diagram, 20 tables, indexes, MeiliSearch index | ✅ Complete |
| 11 | API Specification | REST API endpoints, auth flow, error formats, rate limiting | ✅ Complete |
| 12 | Frontend Architecture | Next.js 15 structure, routing, state management, SEO | ✅ Complete |
| 13 | Security Specification | JWT, RBAC, rate limiting, input validation, backup strategy | ✅ Complete |
| 14 | Development Standards | Folder structure, naming, Git workflow, coding guidelines, email events | ✅ Complete |
| 15 | Project Initialization Guide | Repo scaffold spec — folder structure, config files, npm packages, terminal commands | 🟡 Draft — Awaiting Execution |

---

## The One-Line Summary

> **Bangla AI Hub is building the open infrastructure for the Bangla AI ecosystem —
> so that every Bangla-speaking person can learn, build, share, and earn with AI.**

---

## Guiding Principles (Non-Negotiable)

1. **Open First** — Knowledge must be accessible
2. **Community Driven** — Built by people, not just organization
3. **Bangla Focused** — Every feature starts with Bangla community needs
4. **Quality Over Quantity** — No shortcuts on quality
5. **Long-Term Thinking** — Ecosystem, not just product

---

## Decision Framework

Before building any feature, ask:
- Does this strengthen the Bangla AI ecosystem?
- Does this serve our core users?
- Does this align with our mission?

If all three answers are YES → Build it.
If any answer is NO → Reconsider.

---

## Core Metrics To Track

| Category | Metric |
|----------|--------|
| Community | Monthly Active Users, Active Contributors |
| Content | Published Resources, Dataset Count |
| Quality | Community Satisfaction Score |
| Growth | Monthly Visitors, Registered Users |
| Impact | Universities Connected, Organizations Partnered |

---

---

## Key Technical Decisions (Locked)

| Decision | Choice | Date |
|----------|--------|------|
| Frontend framework | Next.js (TypeScript) | July 2026 |
| Frontend hosting | Vercel | July 2026 |
| Backend | Custom Node.js + Express.js | July 2026 |
| Backend hosting | Render | July 2026 |
| Database | Supabase (PostgreSQL only — not full BaaS) | July 2026 |
| File storage | Cloudflare R2 | July 2026 |
| Search | MeiliSearch | July 2026 |

> Supabase শুধু cloud-hosted PostgreSQL হিসেবে ব্যবহার হবে। Supabase Auth, Storage, বা Edge Functions ব্যবহার হবে না।

---

## Document History

| Date | Change |
|------|--------|
| July 2026 | Documents 01–07 created (foundation planning) |
| July 2026 | Document 02 updated — Competitive Moat section added, AI News Feed added |
| July 2026 | Documents 08–09 added (Dataset Policy + Risk Analysis) |
| July 2026 | Document 04 updated (v2.0) — Final tech stack decided: Custom Backend + Supabase PostgreSQL + Render + Vercel |
| July 2026 | Document 09 updated — Risk 3, 5, 6 updated to reflect new stack |
| July 2026 | Documents 10–14 added — Technical implementation specs (Database Design, API Specification, Frontend Architecture, Security Specification, Development Standards) |
| July 2026 | Document 15 added — Project Initialization Guide (repo scaffold spec, not yet executed) |
| July 2026 | Contributor Application System added — self-serve `user` → `contributor` path replacing ad-hoc admin promotion. Docs 10, 11, 13, 14 updated (new `contributor_applications` table, new API section, RBAC permissions matrix correction, new email events); doc 03's Phase 2 "Contributor verification flow" item pulled forward into this work. |

---

*This index is the starting point. Every document in this folder connects back here.*
