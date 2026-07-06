# Bangla AI Hub — Security Specification
**Document:** 13  
**Version:** 1.0  
**Status:** Foundation Draft  
**Date:** July 2026

---

## Security Philosophy

1. **Defense in Depth** — Multiple layers of protection. No single point of failure.
2. **Least Privilege** — Users and services get only the permissions they need.
3. **Secure by Default** — New features are locked down by default, opened intentionally.
4. **Fail Safely** — Errors should not expose sensitive data or grant unintended access.
5. **Never Trust Input** — Validate and sanitize everything from every source.

---

## Authentication

### JWT Strategy

```
Access Token:
  - Algorithm: HS256
  - Expiry: 15 minutes
  - Stored: in-memory (JavaScript variable, never localStorage)
  - Payload: { userId, email, roles, iat, exp }

Refresh Token:
  - Algorithm: HS256
  - Expiry: 30 days
  - Stored: HTTP-only cookie (inaccessible to JavaScript)
  - DB: hashed (SHA-256) in refresh_tokens table
  - Rotation: new token issued on every refresh
```

### Why NOT localStorage for Tokens

`localStorage` is accessible by any JavaScript on the page → XSS attack can steal tokens.
`HTTP-only cookies` cannot be read by JavaScript → XSS-safe.

### Token Rotation

```
On every /auth/refresh:
1. Validate the incoming refresh token against DB (hash match + not revoked + not expired)
2. Issue a NEW access token + NEW refresh token
3. Revoke the OLD refresh token in DB (revoked = true, revoked_at = NOW())
4. Set new refresh token as HTTP-only cookie

If the same refresh token is used twice (replay attack):
→ Revoke ALL tokens for that user (account compromise assumed)
→ Force re-login
```

### Password Security

```javascript
// Hashing: bcrypt with cost factor 12
const hash = await bcrypt.hash(password, 12)

// Validation rules (enforce on registration + password change)
- Minimum 8 characters
- At least 1 uppercase letter
- At least 1 number
- At least 1 special character (!@#$%^&*)
- Cannot be same as previous 5 passwords (stored hashes)
```

### Google OAuth Flow

```
1. Frontend → GET /api/v1/auth/google
2. Backend → redirect to Google OAuth consent screen
3. User approves → Google → GET /api/v1/auth/google/callback?code=...
4. Backend exchanges code for Google user info
5. If email exists → link to existing account
   If new email → create new user account
6. Issue access token + set refresh cookie
7. Redirect to frontend /dashboard
```

---

## RBAC — Role-Based Access Control

### Roles Hierarchy

```
super_admin
  └── admin
        └── editor
              └── moderator
                    └── verified_contributor
                          └── contributor
                                └── user
                                      └── guest
```

### Permissions Matrix

| Permission | guest | user | contributor | verified | moderator | editor | admin | super_admin |
|-----------|-------|------|-------------|----------|-----------|--------|-------|-------------|
| View resources | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| View user profiles | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Register / Login | ✅ | — | — | — | — | — | — | — |
| Submit resource | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Edit own resource | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Delete own resource | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Bookmark resources | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Post comments | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Report resources | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Upload files (datasets) | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Edit any resource | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ |
| Delete any comment | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ |
| Approve/reject resources | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ |
| Resolve reports | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ |
| Manage users | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |
| Ban users | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |
| Change roles | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |
| Manage admins | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| System configuration | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |

### Express Middleware Implementation

```javascript
// middleware/authorize.js
const authorize = (...requiredPermissions) => {
  return async (req, res, next) => {
    const userPermissions = await getUserPermissions(req.user.id)
    
    const hasAll = requiredPermissions.every(p => 
      userPermissions.includes(p)
    )
    
    if (!hasAll) {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Insufficient permissions.' }
      })
    }
    
    next()
  }
}

// Usage in routes
router.post('/resources', authenticate, authorize('resource:create'), submitResource)
router.post('/admin/resources/:id/approve', authenticate, authorize('resource:approve'), approveResource)
router.put('/admin/users/:id/role', authenticate, authorize('user:role_change'), changeRole)
```

---

## Rate Limiting

### Strategy

```
Library: express-rate-limit + rate-limit-redis (for multi-instance)
Key: IP address (public endpoints) + user ID (authenticated endpoints)
Storage: Redis (in production), memory (in development)
```

### Limits Table

| Endpoint | Window | Max Requests | Key |
|----------|--------|-------------|-----|
| `POST /auth/login` | 15 min | 5 | per IP |
| `POST /auth/register` | 1 hour | 3 | per IP |
| `POST /auth/forgot-password` | 1 hour | 3 | per IP |
| `POST /auth/refresh` | 15 min | 10 | per IP |
| `POST /resources` (submit) | 1 hour | 10 | per user |
| `POST /resources/:id/report` | 1 day | 20 | per user |
| `GET /search` | 1 min | 60 | per IP |
| All other `GET` | 1 min | 300 | per IP |
| Admin endpoints | 1 min | 30 | per user |

### Implementation

```javascript
// middleware/rateLimiter.js
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 5,
  keyGenerator: (req) => req.ip,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many login attempts. Please try again in 15 minutes.',
        retryAfter: Math.ceil(req.rateLimit.resetTime / 1000)
      }
    })
  }
})
```

---

## HTTP Security Headers (Helmet.js)

```javascript
// app.js
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],  // tighten in production
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https://pub-*.r2.dev"],  // Cloudflare R2
      connectSrc: ["'self'", "https://api.banglaai.dev"],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
    }
  },
  hsts: {
    maxAge: 31536000,       // 1 year
    includeSubDomains: true,
    preload: true,
  },
  noSniff: true,            // X-Content-Type-Options: nosniff
  xssFilter: true,          // X-XSS-Protection
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' }
}))
```

---

## CORS Configuration

```javascript
// config/cors.js
const corsOptions = {
  origin: (origin, callback) => {
    const allowedOrigins = [
      'https://banglaai.dev',
      'https://www.banglaai.dev',
      process.env.NODE_ENV === 'development' && 'http://localhost:3000'
    ].filter(Boolean)
    
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true)
    } else {
      callback(new Error('Not allowed by CORS'))
    }
  },
  credentials: true,        // Required for cookies
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}
```

---

## Input Validation & Injection Prevention

### SQL Injection

```javascript
// NEVER: string concatenation
const q = `SELECT * FROM users WHERE email = '${email}'`  // ❌ DANGEROUS

// ALWAYS: parameterized queries with pg
const { rows } = await pool.query(
  'SELECT * FROM users WHERE email = $1',
  [email]  // ✅ Safe
)
```

### XSS Prevention

```javascript
// Sanitize all user-generated text before storing
import DOMPurify from 'isomorphic-dompurify'

const sanitized = DOMPurify.sanitize(req.body.description, {
  ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'ul', 'ol', 'li', 'code', 'pre'],
  ALLOWED_ATTR: ['href', 'class'],
})
```

### Input Validation (Zod)

```javascript
// validators/resourceValidator.js
import { z } from 'zod'

const submitResourceSchema = z.object({
  title: z.string().min(5).max(300).trim(),
  description: z.string().min(50).max(5000).trim(),
  type: z.enum(['dataset', 'paper', 'tool', 'tutorial', 'prompt']),
  category_id: z.number().int().positive(),
  tags: z.array(z.string().max(50)).max(10),
  language: z.enum(['bn', 'en', 'both']),
  license: z.string().max(100).optional(),
  external_url: z.string().url().optional(),
})

// Middleware
const validate = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.body)
  if (!result.success) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Input validation failed.',
        details: result.error.errors.map(e => ({
          field: e.path.join('.'),
          message: e.message,
        }))
      }
    })
  }
  req.validatedBody = result.data
  next()
}
```

---

## File Upload Security

```javascript
// Allowed file types for datasets
const ALLOWED_MIME_TYPES = [
  'text/csv',
  'application/json',
  'text/plain',
  'application/zip',
  'application/x-tar',
  'application/gzip',
]

const MAX_FILE_SIZE = 500 * 1024 * 1024  // 500 MB

// Validation before upload to R2
const validateUpload = (file) => {
  // 1. Check MIME type (from magic bytes, not extension)
  if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    throw new Error('File type not allowed')
  }
  
  // 2. Check file size
  if (file.size > MAX_FILE_SIZE) {
    throw new Error('File too large (max 500MB)')
  }
  
  // 3. Scan filename for path traversal
  const safeName = path.basename(file.originalname)
  if (safeName !== file.originalname) {
    throw new Error('Invalid filename')
  }
  
  // 4. Generate UUID filename (don't use user-provided name)
  const ext = path.extname(safeName)
  const storeName = `${uuidv4()}${ext}`
  
  return storeName
}
```

---

## Environment Variables Security

### Rules (CRITICAL)

```
❌ NEVER commit .env or .env.local to git
❌ NEVER log environment variable values
❌ NEVER expose secrets in API responses
❌ NEVER put secrets in frontend code

✅ .gitignore must include: .env, .env.local, .env.*.local
✅ Use separate secrets for development and production
✅ Rotate secrets immediately if accidentally exposed
```

### Backend `.env` (never commit)

```bash
# .env (git-ignored)

# Database (Supabase PostgreSQL)
DATABASE_URL=postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres

# JWT Secrets — generate with: openssl rand -hex 64
JWT_ACCESS_SECRET=your_64_char_random_hex_here
JWT_REFRESH_SECRET=another_64_char_random_hex_here

# OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=https://api.banglaai.dev/api/v1/auth/google/callback

# Cloudflare R2
R2_ACCOUNT_ID=your_account_id
R2_ACCESS_KEY_ID=your_access_key
R2_SECRET_ACCESS_KEY=your_secret_key
R2_BUCKET_NAME=banglaai-datasets

# MeiliSearch
MEILISEARCH_HOST=http://localhost:7700
MEILISEARCH_ADMIN_KEY=your_admin_key

# Email (e.g., Resend)
EMAIL_API_KEY=re_your_api_key
EMAIL_FROM=noreply@banglaai.dev

# App
NODE_ENV=production
PORT=5000
FRONTEND_URL=https://banglaai.dev
```

---

## Backup Strategy

### Database Backup

```
Type: Supabase managed backups (automatic)
Frequency: Daily (included in Supabase plan)
Retention: 7 days (free plan) / 30 days (pro plan)
Location: Supabase infrastructure

Additional:
- Weekly manual pg_dump to Cloudflare R2
- Test restore quarterly
```

### Manual Backup Script

```bash
#!/bin/bash
# scripts/backup.sh — run weekly via cron

DATE=$(date +%Y%m%d)
FILENAME="banglaai_backup_${DATE}.sql"

# Export database
pg_dump "$DATABASE_URL" > "/tmp/$FILENAME"

# Gzip compress
gzip "/tmp/$FILENAME"

# Upload to R2
aws s3 cp "/tmp/${FILENAME}.gz" "s3://banglaai-backups/${FILENAME}.gz" \
  --endpoint-url "https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com"

# Clean temp file
rm "/tmp/${FILENAME}.gz"

echo "Backup complete: ${FILENAME}.gz"
```

### File Storage Backup

```
Cloudflare R2:
- Dataset files are stored with automatic redundancy (R2 SLA)
- No additional backup needed for phase 1
- Phase 2+: enable R2 cross-region replication
```

---

## Security Checklist (Pre-Launch)

### Authentication
- [ ] bcrypt cost factor = 12
- [ ] JWT secrets are 64+ char random strings (not guessable)
- [ ] Refresh tokens are hashed in DB (not stored plain)
- [ ] HTTP-only cookie set with `Secure`, `SameSite=Strict`
- [ ] Token rotation on every refresh
- [ ] Refresh token replay → revoke all user tokens

### API Security
- [ ] All endpoints have rate limiting
- [ ] All write endpoints require authentication
- [ ] All admin endpoints require RBAC check
- [ ] Input validation on all POST/PUT endpoints
- [ ] File upload validates MIME type from magic bytes
- [ ] SQL uses parameterized queries only (no concatenation)

### Infrastructure
- [ ] Helmet.js configured with strict CSP
- [ ] CORS only allows known origins
- [ ] HTTPS enforced (HSTS enabled)
- [ ] `.env` in `.gitignore` (verify before first push)
- [ ] No secrets in git history

### Monitoring
- [ ] Failed login attempts logged
- [ ] Admin actions in audit_logs table
- [ ] Error logs don't expose stack traces in production

---

*Document 13 of 14 — Bangla AI Hub Project Planning*
