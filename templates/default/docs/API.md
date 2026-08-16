# API Reference

Base URL: `http://localhost:4000` (dev) — set `VITE_API_URL` for production.

All requests from the browser must use `credentials: "include"` to send the auth cookie. Mutation requests (POST/PUT/DELETE) must include an `Origin` header matching `FRONTEND_URL` — browsers send this automatically. API clients (curl, Postman) bypassing cookies with an explicit `Authorization: Bearer` header are exempt from this Origin check since they are not vulnerable to CSRF.

## Authentication

Session is managed via an `httpOnly`, `SameSite=Lax` cookie named `auth-token`, set by the server on successful register/login.

> **Cross-domain deployment note:** SameSite=Lax cookies are scoped to the registrable domain. They work correctly when frontend and backend share a site (e.g. `app.example.com` → `api.example.com`). They will **not** be sent if the two are on completely different domains (e.g. Vercel + Render default domains). In that case, the Origin validation middleware returns a clear `403 INVALID_ORIGIN` response rather than silently failing. Update `FRONTEND_URL` and configure a custom domain on your hosting provider to resolve it.

---

## Error Shape

All error responses use a consistent JSON format:

```json
{ "error": "Human-readable message", "code": "MACHINE_READABLE_CODE" }
```

| Code | Status | Meaning |
|---|---|---|
| `BAD_REQUEST` | 400 | Invalid input / failed schema validation |
| `UNAUTHORIZED` | 401 | Missing or invalid auth token |
| `INVALID_CREDENTIALS` | 401 | Wrong email or password |
| `FORBIDDEN` | 403 | Authenticated but wrong role |
| `INVALID_ORIGIN` | 403 | Request origin not in allowlist |
| `NOT_FOUND` | 404 | Resource does not exist |
| `CONFLICT` | 409 | Duplicate resource (e.g. email already registered) |
| `RATE_LIMITED` | 429 | Too many auth requests — see `Retry-After` header |
| `INTERNAL_ERROR` | 500 | Unexpected server error |
| `DECRYPT_ERROR` | 500 | Failed to decrypt a stored field (data corruption) |

---

## Routes

### `GET /health`

No auth required.

**Response 200:**
```json
{ "ok": true, "db": true }
```

**Response 503** (database unreachable):
```json
{ "ok": false, "db": false, "error": "Database unreachable" }
```

---

### `POST /auth/register`

Create a new account. Sets `auth-token` cookie on success.

**Request body:**
```json
{
  "email": "user@example.com",   // required, valid email
  "password": "mypassword",      // required, min 8 characters
  "ssn": "123-45-6789"           // optional — stored AES-256-GCM encrypted
}
```

**Response 201:**
```json
{
  "user": { "id": "uuid", "email": "user@example.com", "role": "member" }
}
```

**Error codes:** `BAD_REQUEST` (400), `CONFLICT` (409)

---

### `POST /auth/login`

Authenticate with email + password. Sets `auth-token` cookie on success.

**Request body:**
```json
{
  "email": "user@example.com",
  "password": "mypassword"
}
```

**Response 200:**
```json
{
  "user": { "id": "uuid", "email": "user@example.com", "role": "member" }
}
```

**Error codes:** `BAD_REQUEST` (400), `INVALID_CREDENTIALS` (401)

> **Security note:** Both "email not found" and "wrong password" return the identical `INVALID_CREDENTIALS` response to prevent user enumeration.

---

### `POST /auth/logout`

Clears the `auth-token` cookie. Requires authentication.

**Auth:** Cookie required.

**Response 200:**
```json
{ "ok": true }
```

**Error codes:** `UNAUTHORIZED` (401)

---

### `GET /users/me`

Returns the authenticated user's own profile.

**Auth:** Cookie required.

**Response 200:**
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "role": "member",
  "createdAt": "2024-01-01T00:00:00.000Z"
}
```

**Error codes:** `UNAUTHORIZED` (401)

---

### `GET /users?limit=20&cursor=<id>`

List all users with cursor-based pagination. Admin only.

**Auth:** Cookie required. Role: `admin`.

**Query params:**
| Param | Type | Default | Range | Description |
|---|---|---|---|---|
| `limit` | integer | 20 | 1–100 | Max users per page |
| `cursor` | string | — | — | Last `id` from previous page |

**Response 200:**
```json
{
  "users": [
    { "id": "uuid", "email": "...", "role": "member", "createdAt": "..." }
  ],
  "nextCursor": "uuid-of-last-item-or-null"
}
```

**Error codes:** `UNAUTHORIZED` (401), `FORBIDDEN` (403), `BAD_REQUEST` (400 — invalid limit)

---

### `GET /users/:id/ssn`

Decrypt and return a user's SSN. Admin only. Writes an audit log entry on every call.

**Auth:** Cookie required. Role: `admin`.

**Response 200:**
```json
{ "userId": "uuid", "ssn": "123-45-6789" }
```

**Error codes:** `UNAUTHORIZED` (401), `FORBIDDEN` (403), `NOT_FOUND` (404), `DECRYPT_ERROR` (500)

> **Audit log:** Every call to this route writes a `user.view_sensitive_field` entry with `{ field: "ssn", targetUserId }` — never the SSN value itself.
