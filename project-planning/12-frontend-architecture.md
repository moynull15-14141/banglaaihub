# Bangla AI Hub — Frontend Architecture
**Document:** 12  
**Version:** 1.0  
**Status:** Foundation Draft  
**Date:** July 2026

---

## Stack

| Technology | Choice | Reason |
|-----------|--------|--------|
| Framework | **Next.js 15** (App Router) | SSR, SSG, SEO, Image optimization |
| Language | **TypeScript** | Type safety, maintainability |
| Styling | **Tailwind CSS** | Utility-first, fast development |
| UI Components | **shadcn/ui** | Accessible, customizable components |
| State Management | **Zustand** (global) + **React Query** (server state) | Lightweight + powerful |
| Form Handling | **React Hook Form** + **Zod** | Performance + validation |
| Icons | **Lucide React** | Consistent icon set |
| Date | **date-fns** | Lightweight date utility |
| HTTP Client | **Axios** | Interceptors for token refresh |
| Rich Text | **Tiptap** | Resource description editor |

---

## Folder Structure

```
banglaai-frontend/
├── app/                          ← Next.js App Router
│   ├── (public)/                 ← Public pages (no auth required)
│   │   ├── page.tsx              ← Homepage
│   │   ├── datasets/
│   │   │   ├── page.tsx          ← Dataset listing
│   │   │   └── [slug]/
│   │   │       └── page.tsx      ← Dataset detail
│   │   ├── papers/
│   │   │   ├── page.tsx
│   │   │   └── [slug]/page.tsx
│   │   ├── tools/
│   │   │   ├── page.tsx
│   │   │   └── [slug]/page.tsx
│   │   ├── search/
│   │   │   └── page.tsx
│   │   ├── users/
│   │   │   └── [username]/page.tsx   ← Public profile
│   │   ├── categories/
│   │   │   └── [slug]/page.tsx
│   │   └── about/
│   │       └── page.tsx
│   │
│   ├── (auth)/                   ← Auth pages (redirect if logged in)
│   │   ├── login/page.tsx
│   │   ├── register/page.tsx
│   │   ├── verify-email/page.tsx
│   │   └── forgot-password/page.tsx
│   │
│   ├── (dashboard)/              ← Protected pages (auth required)
│   │   ├── layout.tsx            ← Dashboard layout with sidebar
│   │   ├── dashboard/page.tsx    ← User dashboard
│   │   ├── submit/page.tsx       ← Submit resource
│   │   ├── bookmarks/page.tsx
│   │   ├── notifications/page.tsx
│   │   ├── settings/
│   │   │   ├── page.tsx
│   │   │   └── profile/page.tsx
│   │   └── my-submissions/page.tsx
│   │
│   ├── (admin)/                  ← Admin panel (admin role required)
│   │   ├── layout.tsx
│   │   ├── admin/page.tsx        ← Dashboard
│   │   ├── admin/pending/page.tsx
│   │   ├── admin/users/page.tsx
│   │   └── admin/reports/page.tsx
│   │
│   ├── api/                      ← Next.js API routes (minimal — mostly proxy)
│   │   └── auth/
│   │       └── [...nextauth]/route.ts
│   │
│   ├── layout.tsx                ← Root layout (fonts, providers)
│   ├── not-found.tsx
│   └── error.tsx
│
├── components/
│   ├── ui/                       ← shadcn/ui components (auto-generated)
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── dialog.tsx
│   │   └── ...
│   │
│   ├── layout/                   ← Layout components
│   │   ├── Navbar.tsx
│   │   ├── Footer.tsx
│   │   ├── Sidebar.tsx
│   │   └── MobileMenu.tsx
│   │
│   ├── resource/                 ← Resource-related components
│   │   ├── ResourceCard.tsx
│   │   ├── ResourceGrid.tsx
│   │   ├── ResourceDetail.tsx
│   │   ├── ResourceForm.tsx      ← Submit/Edit form
│   │   ├── ResourceStats.tsx
│   │   └── ResourceFilters.tsx
│   │
│   ├── dataset/                  ← Dataset-specific
│   │   ├── DatasetCard.tsx
│   │   └── DatasetMetadata.tsx
│   │
│   ├── search/
│   │   ├── SearchBar.tsx
│   │   ├── SearchResults.tsx
│   │   └── SearchFilters.tsx
│   │
│   ├── user/
│   │   ├── UserAvatar.tsx
│   │   ├── UserCard.tsx
│   │   └── ReputationBadge.tsx
│   │
│   ├── common/                   ← Shared utility components
│   │   ├── LoadingSpinner.tsx
│   │   ├── EmptyState.tsx
│   │   ├── ErrorBoundary.tsx
│   │   ├── Pagination.tsx
│   │   ├── Tag.tsx
│   │   ├── Badge.tsx
│   │   └── ConfirmDialog.tsx
│   │
│   └── seo/
│       ├── MetaTags.tsx
│       └── JsonLd.tsx            ← Schema.org structured data
│
├── lib/
│   ├── api/                      ← API client functions
│   │   ├── client.ts             ← Axios instance + interceptors
│   │   ├── auth.ts               ← Auth API calls
│   │   ├── resources.ts
│   │   ├── users.ts
│   │   └── search.ts
│   │
│   ├── hooks/                    ← Custom React hooks
│   │   ├── useAuth.ts
│   │   ├── useResources.ts
│   │   ├── useSearch.ts
│   │   └── useInfiniteScroll.ts
│   │
│   ├── store/                    ← Zustand global state
│   │   ├── authStore.ts          ← User session, tokens
│   │   ├── uiStore.ts            ← Theme, sidebar state
│   │   └── notificationStore.ts
│   │
│   ├── utils/
│   │   ├── format.ts             ← Date, number formatting
│   │   ├── slug.ts               ← Slug generation
│   │   ├── validation.ts         ← Zod schemas
│   │   └── cn.ts                 ← Tailwind class merge utility
│   │
│   └── constants/
│       ├── routes.ts             ← All route paths
│       ├── resourceTypes.ts
│       └── categories.ts
│
├── types/                        ← TypeScript type definitions
│   ├── resource.ts
│   ├── user.ts
│   ├── api.ts                    ← API response types
│   └── index.ts
│
├── public/
│   ├── logo.svg
│   ├── og-image.png              ← Default OpenGraph image
│   ├── robots.txt
│   └── sitemap.xml               ← Generated by Next.js
│
├── .env.local                    ← Local environment (never commit)
├── next.config.js
├── tailwind.config.js
├── tsconfig.json
└── package.json
```

---

## Routing Structure

| Route | Page | Auth |
|-------|------|------|
| `/` | Homepage | Public |
| `/datasets` | Dataset listing | Public |
| `/datasets/[slug]` | Dataset detail | Public |
| `/papers` | Paper listing | Public |
| `/papers/[slug]` | Paper detail | Public |
| `/tools` | Tools/Tutorials | Public |
| `/search` | Search results | Public |
| `/users/[username]` | Public profile | Public |
| `/categories/[slug]` | Category listing | Public |
| `/login` | Login page | Guest only |
| `/register` | Register page | Guest only |
| `/dashboard` | User dashboard | Auth required |
| `/submit` | Submit resource | Auth required |
| `/bookmarks` | My bookmarks | Auth required |
| `/notifications` | Notifications | Auth required |
| `/settings` | Account settings | Auth required |
| `/admin` | Admin dashboard | Admin only |
| `/admin/pending` | Pending review | Admin only |
| `/admin/users` | User management | Admin only |

---

## State Management Strategy

### Zustand — Global App State

```typescript
// store/authStore.ts
interface AuthStore {
  user: User | null
  accessToken: string | null
  isLoading: boolean
  login: (credentials: LoginCredentials) => Promise<void>
  logout: () => Promise<void>
  refreshToken: () => Promise<void>
}
```

### React Query — Server State (API Data)

```typescript
// Data fetching with caching
const { data: datasets, isLoading } = useQuery({
  queryKey: ['datasets', filters],
  queryFn: () => api.resources.list(filters),
  staleTime: 5 * 60 * 1000,  // 5 minutes
})

// Mutations
const submitMutation = useMutation({
  mutationFn: api.resources.create,
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['datasets'] })
  }
})
```

---

## Token Refresh — Axios Interceptor

```typescript
// lib/api/client.ts
const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
})

// Attach access token to every request
apiClient.interceptors.request.use((config) => {
  const token = authStore.getState().accessToken
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Auto-refresh on 401
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      await authStore.getState().refreshToken()
      return apiClient(error.config)  // Retry original request
    }
    return Promise.reject(error)
  }
)
```

---

## SEO Architecture

### Metadata (per page)

```typescript
// app/(public)/datasets/[slug]/page.tsx
export async function generateMetadata({ params }): Promise<Metadata> {
  const dataset = await getDataset(params.slug)
  
  return {
    title: `${dataset.title} — Bangla AI Hub`,
    description: dataset.description.slice(0, 160),
    openGraph: {
      title: dataset.title,
      description: dataset.description,
      images: [{ url: dataset.thumbnail_url || '/og-image.png' }],
      type: 'article',
    },
    twitter: {
      card: 'summary_large_image',
      title: dataset.title,
      description: dataset.description,
    },
    alternates: {
      canonical: `https://banglaai.dev/datasets/${params.slug}`,
    }
  }
}
```

### Schema.org (JSON-LD)

```typescript
// components/seo/JsonLd.tsx
export function DatasetJsonLd({ dataset }: { dataset: Dataset }) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Dataset',
    name: dataset.title,
    description: dataset.description,
    url: `https://banglaai.dev/datasets/${dataset.slug}`,
    license: dataset.license,
    creator: {
      '@type': 'Person',
      name: dataset.author.display_name,
    },
    datePublished: dataset.published_at,
    keywords: dataset.tags.join(', '),
    inLanguage: 'bn',
  }
  
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  )
}
```

### Sitemap

```typescript
// app/sitemap.ts — auto-generated by Next.js
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const resources = await getAllResources()
  
  return [
    { url: 'https://banglaai.dev', priority: 1.0 },
    { url: 'https://banglaai.dev/datasets', priority: 0.9 },
    { url: 'https://banglaai.dev/papers', priority: 0.9 },
    ...resources.map(r => ({
      url: `https://banglaai.dev/${r.type}s/${r.slug}`,
      lastModified: r.updated_at,
      priority: 0.8,
    })),
  ]
}
```

### robots.txt

```
# public/robots.txt
User-agent: *
Allow: /
Disallow: /admin/
Disallow: /api/
Disallow: /dashboard/
Disallow: /settings/

Sitemap: https://banglaai.dev/sitemap.xml
```

---

## Environment Variables

```bash
# .env.local (never commit)
NEXT_PUBLIC_API_URL=http://localhost:5000
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_MEILISEARCH_URL=http://localhost:7700
NEXT_PUBLIC_MEILISEARCH_KEY=your_search_key
```

---

## Performance Strategy

| Concern | Solution |
|---------|----------|
| Images | Next.js `<Image>` component with lazy loading |
| Fonts | `next/font` with `display: swap` |
| Data fetching | React Query caching + SSR for first load |
| Bundle size | Dynamic imports for heavy components |
| Static pages | SSG for category + tag pages |
| Dynamic pages | ISR (Incremental Static Regeneration) for resource pages |

---

*Document 12 of 14 — Bangla AI Hub Project Planning*
