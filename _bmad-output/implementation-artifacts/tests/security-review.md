# Security Review

**Generated**: 2026-02-27  
**Project**: bmad-todo-app  
**Scope**: Backend API (Fastify/Node.js), Frontend (React/Nginx), Docker infrastructure  
**Method**: Static code analysis + configuration review

---

## Summary

| Severity | Count |
|---|---|
| 🔴 High | 0 |
| 🟡 Medium | 3 |
| 🟢 Low | 4 |
| ✅ Pass | 9 |

---

## Passed Controls ✅

| Control | Implementation | Evidence |
|---|---|---|
| Password hashing | bcrypt with cost-factor 12 | `routes/auth.ts` — `bcrypt.hash(password, 12)` |
| Auth tokens in httpOnly cookies | `httpOnly: true, sameSite: 'strict'` | `routes/auth.ts` — setCookie on login + register |
| CSRF protection | `sameSite: 'strict'` cookie attribute | Cross-site requests cannot include the auth cookie |
| JWT secret from environment | `process.env.JWT_SECRET` with startup guard | `server.ts` — throws if `JWT_SECRET` not set |
| SQL injection prevention | postgres.js tagged template literals | All queries use `sql\`...\`` — no string concatenation |
| User ownership enforcement | `WHERE user_id = $userId` on all data queries | `db/queries/tasks.ts`, `labels.ts`, `subtasks.ts` |
| Sensitive data not logged | Explicit comment + no `req.body` logging | `routes/auth.ts` — "NEVER log req.body on auth routes" |
| Resource exhaustion protection | `@fastify/under-pressure` configured | Max event-loop delay 1s, max heap 100MB, max RSS 150MB |
| Secrets via environment variables | All credentials in env vars, not source | `docker-compose.yml` — `${POSTGRES_PASSWORD}`, `${JWT_SECRET}` |

---

## Findings

### 🟡 MEDIUM — Open CORS Origin

**Location**: [backend/src/server.ts](../../../backend/src/server.ts#L63-L66)

```typescript
fastify.register(cors, {
  origin: true,   // ← reflects ANY origin with credentials
  credentials: true,
})
```

**Risk**: `origin: true` reflects the incoming `Origin` header, allowing any website to make credentialed requests to the API. In production this should be restricted to the specific frontend URL.

**Recommendation**:
```typescript
fastify.register(cors, {
  origin: process.env.CORS_ORIGIN ?? 'http://localhost:3000',
  credentials: true,
})
```

---

### 🟡 MEDIUM — No Rate Limiting on Auth Endpoints

**Location**: [backend/src/routes/auth.ts](../../../backend/src/routes/auth.ts)

`POST /api/auth/login` and `POST /api/auth/register` have no rate limiting. This exposes the API to brute-force and credential stuffing attacks.

**Recommendation**: Add `@fastify/rate-limit`:
```typescript
fastify.register(rateLimit, {
  max: 10,
  timeWindow: '1 minute',
  keyGenerator: (req) => req.ip,
  // apply only to /api/auth/* routes
})
```

---

### 🟡 MEDIUM — No HTTP Security Headers on Nginx

**Location**: [frontend/nginx.conf](../../../frontend/nginx.conf)

The nginx config sets no security headers. Missing:

| Header | Risk if absent |
|---|---|
| `Content-Security-Policy` | XSS via injected scripts |
| `X-Frame-Options: DENY` | Clickjacking |
| `X-Content-Type-Options: nosniff` | MIME sniffing |
| `Referrer-Policy: strict-origin-when-cross-origin` | Referrer leakage |
| `Permissions-Policy` | Unwanted browser feature access |

**Recommendation**: Add to the `server {}` block in `nginx.conf`:
```nginx
add_header Content-Security-Policy "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline';" always;
add_header X-Frame-Options "DENY" always;
add_header X-Content-Type-Options "nosniff" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header Permissions-Policy "geolocation=(), camera=(), microphone=()" always;
```

---

### 🟢 LOW — Swagger UI Exposed in Production

**Location**: [backend/src/server.ts](../../../backend/src/server.ts#L58-L60)

`/docs` is registered unconditionally. The API schema is publicly browsable in production.

**Recommendation**: Guard with `NODE_ENV`:
```typescript
if (NODE_ENV !== 'production') {
  fastify.register(swaggerUi, { routePrefix: '/docs' })
}
```

---

### 🟢 LOW — No HTTPS in Nginx (TLS Offloading Expected)

**Location**: [frontend/nginx.conf](../../../frontend/nginx.conf)

Nginx only listens on port 80. Acceptable if TLS is terminated upstream (cloud load balancer, Caddy, Traefik), but must be enforced at the infrastructure level before production. The app should **not** be deployed with port 80 exposed directly to the internet.

---

### 🟢 LOW — JWT Tokens without Rotation

**Location**: [backend/src/routes/auth.ts](../../../backend/src/routes/auth.ts#L49)

30-day JWTs with no refresh rotation. A stolen token remains valid for up to 30 days.

**Recommendation**: Implement token rotation on `/api/auth/me` calls (sliding window), or reduce `expiresIn` to 7 days with silent refresh.

---

### 🟢 LOW — `client.ts` Untestable Path (0% coverage)

**Location**: [backend/src/db/client.ts](../../../backend/src/db/client.ts)

The `getSqlClient()` singleton is 0% covered in unit tests because tests inject `sqlOverride`. The singleton logic (null-check, lazy init) is not validated in isolation. E2E tests cover it implicitly.

---

## Dependency Audit

Run to check for known CVEs:

```bash
cd backend  && npm audit
cd frontend && npm audit
```

Key dependencies and their security posture at time of review:

| Package | Version | Notes |
|---|---|---|
| `fastify` | ^5.7.4 | LTS, actively maintained |
| `@fastify/jwt` | ^10.0.0 | Uses `fast-jwt` under the hood — no known CVEs |
| `bcrypt` | ^6.0.0 | Native binding; cost 12 is appropriate for 2026 hardware |
| `postgres` | ^3.4.8 | Parameterized-by-default; no known CVEs |
| `@sinclair/typebox` | ^0.34.48 | Schema validation; no known CVEs |

---

## Pre-Production Checklist

- [ ] Restrict CORS `origin` to production frontend URL
- [ ] Add rate limiting to auth endpoints
- [ ] Add security headers in nginx.conf
- [ ] Guard Swagger UI behind `NODE_ENV !== 'production'`
- [ ] Ensure TLS termination before public exposure (load balancer / reverse proxy)
- [ ] Run `npm audit --audit-level=moderate` in CI and fail on high/critical
- [ ] Rotate JWT secret periodically and document rotation procedure
