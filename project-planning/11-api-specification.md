# Bangla AI Hub — Backend API Specification
**Document:** 11  
**Version:** 1.0  
**Status:** Foundation Draft  
**Date:** July 2026

---

## API Design Principles

1. **Versioning** — সব endpoint `/api/v1/` দিয়ে শুরু। Future-এ `/api/v2/` আসবে
2. **Consistent Response Format** — সব response একই structure follow করবে
3. **JWT Authentication** — stateless, Access Token + Refresh Token pattern
4. **Error Codes** — machine-readable error codes with human-readable messages
5. **Pagination** — সব list endpoint-এ cursor-based pagination
6. **Rate Limiting** — IP এবং user-based rate limiting

---

## Base URL

```
Production:   https://api.banglaai.dev/api/v1
Development:  http://localhost:5000/api/v1
```

---

## Standard Response Format

### Success Response

```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "total": 100,
    "page": 1,
    "limit": 20,
    "hasNextPage": true
  }
}
```

### Error Response

```json
{
  "success": false,
  "error": {
    "code": "RESOURCE_NOT_FOUND",
    "message": "The requested resource does not exist.",
    "details": []
  }
}
```

### Validation Error Response

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Input validation failed.",
    "details": [
      { "field": "title", "message": "Title is required." },
      { "field": "type", "message": "Type must be one of: dataset, paper, tool, tutorial." }
    ]
  }
}
```

---

## Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `VALIDATION_ERROR` | 400 | Input validation failed |
| `UNAUTHORIZED` | 401 | Token missing or invalid |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `RESOURCE_NOT_FOUND` | 404 | Resource does not exist |
| `CONFLICT` | 409 | Duplicate resource (email, slug) |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |
| `INTERNAL_ERROR` | 500 | Server error |
| `SERVICE_UNAVAILABLE` | 503 | Database or external service down |

---

## Authentication Flow

### JWT Token Strategy

```
Access Token:   Short-lived (15 minutes)
Refresh Token:  Long-lived (30 days), stored as HTTP-only cookie
```

### Registration

```
POST /api/v1/auth/register
```

**Request:**
```json
{
  "email": "user@example.com",
  "username": "rafiq_ai",
  "password": "SecurePass123!",
  "display_name": "Rafiq Ahmed"
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "message": "Registration successful. Please check your email to verify your account.",
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "username": "rafiq_ai"
    }
  }
}
```

---

### Login

```
POST /api/v1/auth/login
```

**Request:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "username": "rafiq_ai",
      "display_name": "Rafiq Ahmed",
      "reputation_score": 120,
      "roles": ["contributor"]
    }
  }
}
```

> `refreshToken` is set as **HTTP-only cookie** — not in response body.

---

### Refresh Token

```
POST /api/v1/auth/refresh
```

> Reads refresh token from HTTP-only cookie automatically.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "accessToken": "new_access_token_here"
  }
}
```

---

### Logout

```
POST /api/v1/auth/logout
```

> Revokes refresh token in database + clears cookie.

---

### Google OAuth

```
GET /api/v1/auth/google           -- redirect to Google
GET /api/v1/auth/google/callback  -- Google redirects here
```

---

### Email Verification

```
POST /api/v1/auth/verify-email
```

**Request:**
```json
{ "token": "verification_token_from_email" }
```

---

### Password Reset

```
POST /api/v1/auth/forgot-password
```
```json
{ "email": "user@example.com" }
```

```
POST /api/v1/auth/reset-password
```
```json
{
  "token": "reset_token_from_email",
  "password": "NewSecurePass123!"
}
```

---

## Resources API

### List Resources

```
GET /api/v1/resources
```

**Query Parameters:**
```
type         = dataset | paper | tool | tutorial | prompt
category     = nlp | cv | audio | ...
language     = bn | en | both
status       = approved (default for public)
sort         = newest | popular | downloads | bookmarks
page         = 1
limit        = 20 (max: 100)
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "slug": "bangla-sentiment-dataset-v2",
      "title": "Bangla Sentiment Dataset V2",
      "description": "...",
      "type": "dataset",
      "author": {
        "id": "uuid",
        "username": "rafiq_ai",
        "display_name": "Rafiq Ahmed",
        "avatar_url": "..."
      },
      "category": { "id": 1, "name": "NLP", "slug": "nlp" },
      "tags": ["sentiment", "classification", "social-media"],
      "view_count": 1240,
      "download_count": 380,
      "bookmark_count": 45,
      "published_at": "2026-03-15T10:00:00Z"
    }
  ],
  "meta": {
    "total": 450,
    "page": 1,
    "limit": 20,
    "hasNextPage": true
  }
}
```

---

### Get Single Resource

```
GET /api/v1/resources/:slug
```

**Response (200):**
Full resource object including dataset/paper-specific fields.

---

### Submit Resource

```
POST /api/v1/resources
Authorization: Bearer <access_token>
```

**Request (Dataset):**
```json
{
  "title": "Bangla Sentiment Dataset V2",
  "description": "10,000 annotated social media posts...",
  "type": "dataset",
  "category_id": 1,
  "tags": ["sentiment", "classification"],
  "language": "bn",
  "license": "CC-BY-4.0",
  "external_url": "https://huggingface.co/...",
  "dataset": {
    "version": "v2.0",
    "file_format": "CSV",
    "record_count": 10000,
    "annotation_type": "sentiment-classification",
    "domain": "social-media"
  }
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "slug": "bangla-sentiment-dataset-v2",
    "status": "pending",
    "message": "Your submission is under review. We will notify you within 48 hours."
  }
}
```

---

### Update Resource

```
PUT /api/v1/resources/:slug
Authorization: Bearer <access_token>
```

> Only author or admin can update.

---

### Delete Resource (Soft Delete)

```
DELETE /api/v1/resources/:slug
Authorization: Bearer <access_token>
```

> Sets `deleted_at` timestamp. Data is NOT removed from database.

---

### Upload Dataset File

```
POST /api/v1/resources/:slug/upload
Authorization: Bearer <access_token>
Content-Type: multipart/form-data
```

> File goes to Cloudflare R2. Returns signed URL.

---

### Bookmark Resource

```
POST   /api/v1/resources/:slug/bookmark   -- add bookmark
DELETE /api/v1/resources/:slug/bookmark   -- remove bookmark
Authorization: Bearer <access_token>
```

---

### Report Resource

```
POST /api/v1/resources/:slug/report
Authorization: Bearer <access_token>
```

```json
{
  "reason": "wrong_data",
  "description": "The dataset labels are incorrect..."
}
```

---

## Users API

### Get User Profile (Public)

```
GET /api/v1/users/:username
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "username": "rafiq_ai",
    "display_name": "Rafiq Ahmed",
    "avatar_url": "...",
    "bio": "NLP researcher at BUET",
    "institution": "BUET",
    "reputation_score": 350,
    "is_verified": true,
    "resources": [ ... ],
    "stats": {
      "total_resources": 12,
      "total_downloads": 3400,
      "total_views": 18000
    }
  }
}
```

---

### Get Own Profile

```
GET /api/v1/users/me
Authorization: Bearer <access_token>
```

---

### Update Own Profile

```
PUT /api/v1/users/me
Authorization: Bearer <access_token>
```

---

### Get My Bookmarks

```
GET /api/v1/users/me/bookmarks
Authorization: Bearer <access_token>
```

---

### Get My Submissions

```
GET /api/v1/users/me/submissions
Authorization: Bearer <access_token>
```

---

### Get My Notifications

```
GET    /api/v1/notifications
PATCH  /api/v1/notifications/:id/read
PATCH  /api/v1/notifications/read-all
Authorization: Bearer <access_token>
```

---

## Search API

```
GET /api/v1/search?q=bangla+sentiment&type=dataset
```

> MeiliSearch-powered. Returns ranked results.

**Query Parameters:**
```
q        = search query (required)
type     = dataset | paper | tool | tutorial
category = nlp | cv | audio
language = bn | en
sort     = relevance | newest | popular
page     = 1
limit    = 20
```

---

## Categories API

```
GET /api/v1/categories
GET /api/v1/categories/:slug
GET /api/v1/categories/:slug/resources
```

---

## Tags API

```
GET /api/v1/tags                     -- popular tags
GET /api/v1/tags/search?q=sentiment  -- search tags
GET /api/v1/tags/:slug/resources
```

---

## Comments API

```
GET    /api/v1/resources/:slug/comments
POST   /api/v1/resources/:slug/comments
PUT    /api/v1/comments/:id
DELETE /api/v1/comments/:id
POST   /api/v1/comments/:id/upvote
Authorization: Bearer <access_token> (for write operations)
```

---

## Admin API

> Requires `admin` or `super_admin` role.

```
GET    /api/v1/admin/resources/pending          -- pending submissions
POST   /api/v1/admin/resources/:id/approve
POST   /api/v1/admin/resources/:id/reject
GET    /api/v1/admin/users
PUT    /api/v1/admin/users/:id/role
POST   /api/v1/admin/users/:id/ban
GET    /api/v1/admin/reports
POST   /api/v1/admin/reports/:id/resolve
GET    /api/v1/admin/audit-logs
```

---

## Rate Limiting

| Endpoint | Limit |
|----------|-------|
| `POST /auth/login` | 5 req/15 min per IP |
| `POST /auth/register` | 3 req/hour per IP |
| `POST /resources` | 10 req/hour per user |
| `GET /search` | 60 req/min per IP |
| All other GET | 300 req/min per IP |

---

## HTTP Headers

### Request Headers

```
Authorization: Bearer <access_token>
Content-Type: application/json
Accept: application/json
```

### Response Headers

```
Content-Type: application/json
X-Request-ID: uuid              -- trace ID for debugging
X-RateLimit-Limit: 300
X-RateLimit-Remaining: 299
X-RateLimit-Reset: 1720000000
```

---

## Middleware Stack (Express.js)

```javascript
// Order matters
app.use(helmet())           // Security headers
app.use(cors(corsOptions))  // CORS
app.use(compression())      // Gzip
app.use(express.json())     // Body parser
app.use(rateLimiter)        // Rate limiting
app.use(requestLogger)      // Log all requests

// Route-specific
router.use(authenticate)    // JWT verification
router.use(authorize(role)) // Permission check
```

---

*Document 11 of 14 — Bangla AI Hub Project Planning*
