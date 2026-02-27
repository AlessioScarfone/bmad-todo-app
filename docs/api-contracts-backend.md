# API Contracts — Backend

> Part: `backend` | Generated: 2026-02-27 (rescan) | Scan: Quick (read from source)

---

## Overview

- **Base path:** `/api` (relative — Nginx proxies to backend in production; use `http://localhost:3001/api` in dev)
- **OpenAPI / Swagger UI:** `http://localhost:3001/docs` (served by `@fastify/swagger-ui`)
- **Protocol:** HTTP/1.1 + JSON (`Content-Type: application/json`)
- **Authentication:** HttpOnly cookie named `token` (JWT HS256, 30-day expiry). Sent automatically by browser.
- **Protected routes:** All non-auth routes require a valid `token` cookie. Returns `401` if missing/invalid.
- **Input validation:** TypeBox schemas via Fastify + AJV — returns `400` on invalid input.
- **Error format:** `{ "statusCode": number, "error": "ERROR_CODE", "message": "human-readable string" }` for 4xx/5xx.

---

## Auth Routes — `/api/auth`

### `POST /api/auth/register`
Register a new user account. **Auto-logs in** the user by setting a JWT cookie on success.

**Request body:**
```json
{ "email": "user@example.com", "password": "secret123" }
```

**Success `201`:** Returns user object + sets `Set-Cookie: token=<JWT>; HttpOnly; SameSite=Strict; Path=/; Max-Age=2592000`
```json
{ "id": 1, "email": "user@example.com" }
```

**Errors:** `400` (validation), `409` `CONFLICT` (email already in use)

---

### `POST /api/auth/login`
Authenticate and set JWT cookie (30-day expiry).

**Request body:**
```json
{ "email": "user@example.com", "password": "secret123" }
```

**Success `200`:** Sets `Set-Cookie: token=<JWT>; HttpOnly; SameSite=Strict; Path=/; Max-Age=2592000`
```json
{ "id": 1, "email": "user@example.com" }
```

**Errors:** `400` (validation), `401` `UNAUTHORIZED` (invalid email or password)

---

### `GET /api/auth/me`
Return the currently authenticated user. Protected route.

**Success `200`:**
```json
{ "id": 1, "email": "user@example.com" }
```

**Errors:** `401` (no/invalid cookie)

---

### `POST /api/auth/logout`
Clear the JWT cookie. Succeeds even if cookie is absent or expired (idempotent).

**No request body.**

**Success `200`:** Clears `token` cookie.
```json
{ "message": "Logged out" }
```

---

## Task Routes — `/api/tasks`

> All routes require authentication (valid `token` cookie).

### `GET /api/tasks`
List all tasks for the authenticated user.

**Query params (declared, optional):**
| Param | Type | Description |
|---|---|---|
| `label` | string | Filter by label |
| `status` | string | Filter by completion status |
| `deadline` | string | Filter by deadline |
| `sort` | string | Sort order |

**Success `200`:** Array of task objects with embedded labels.
```json
[
  {
    "id": 1,
    "userId": 1,
    "title": "Buy groceries",
    "isCompleted": false,
    "completedAt": null,
    "deadline": "2026-03-01",
    "createdAt": "2026-02-27T10:00:00.000Z",
    "updatedAt": "2026-02-27T10:00:00.000Z",
    "labels": [{ "id": 1, "name": "Shopping" }]
  }
]
```

---

### `POST /api/tasks`
Create a new task.

**Request body:**
```json
{ "title": "Buy groceries" }
```

**Success `201`:** New task object.

**Errors:** `400` (missing/empty/blank title)

---

### `PATCH /api/tasks/:id`
Update task `title` and/or `deadline`. **Does NOT control completion state** (use `/complete` or `/uncomplete`).

**Request body (send at least one field):**
```json
{ "title": "Updated title" }
{ "deadline": "2026-03-15" }
{ "deadline": null }
{ "title": "New title", "deadline": "2026-03-15" }
```

**Success `200`:** Updated task object.

**Errors:** `400` (no fields / blank title), `404` (not found / not owned)

---

### `PATCH /api/tasks/:id/complete`
Mark a task as completed. Sets `isCompleted: true` and records `completedAt`.

**No request body.**

**Success `200`:** Updated task object (`isCompleted: true`).

**Errors:** `404` (not found / not owned)

---

### `PATCH /api/tasks/:id/uncomplete`
Mark a task as incomplete. Sets `isCompleted: false`, clears `completedAt`.

**No request body.**

**Success `200`:** Updated task object (`isCompleted: false`).

**Errors:** `404` (not found / not owned)

---

### `DELETE /api/tasks/:id`
Delete a task (cascades to subtasks and task_labels via DB constraints).

**Success `204`:** No body.

**Errors:** `404` (not found / not owned)

---

## Label Routes — `/api/labels`

> All routes require authentication.

### `GET /api/labels`
List all labels belonging to the authenticated user.

**Success `200`:**
```json
[{ "id": 1, "name": "Work" }]
```

---

### `POST /api/tasks/:id/labels`
Attach a label to a task by name. **Creates the label first if it doesn't exist** (upsert + attach). Names are unique per user (`UNIQUE(user_id, name)`).

**Request body:**
```json
{ "name": "Work" }
```

**Success `201`** (label newly created): `{ "id": 1, "name": "Work" }`
**Success `200`** (label already existed): `{ "id": 1, "name": "Work" }`

**Errors:** `400` (blank name), `404` (task not found / not owned)

---

### `DELETE /api/tasks/:id/labels/:labelId`
Detach a label from a task (does NOT delete the label itself).

**Success `204`:** No body.

**Errors:** `404` (label not attached to task)

---

### `DELETE /api/labels/:id`
Permanently delete a label (also removes all task_label associations via DB cascade).

**Success `204`:** No body.

**Errors:** `404` (label not found), `403` `FORBIDDEN` (label not owned by user)

---

## Subtask Routes — `/api/tasks/:id/subtasks`

> All routes require authentication. `:id` is the parent task ID.

### `GET /api/tasks/:id/subtasks`
List all subtasks for a task.

**Success `200`:**
```json
[
  { "id": 1, "taskId": 1, "title": "Buy milk", "isCompleted": false, "createdAt": "..." }
]
```

**Errors:** `401` (unauthenticated)

---

### `POST /api/tasks/:id/subtasks`
Add a subtask to a task.

**Request body:**
```json
{ "title": "Buy milk" }
```

**Success `201`:**
```json
{ "id": 1, "taskId": 1, "title": "Buy milk", "isCompleted": false, "createdAt": "..." }
```

**Errors:** `400` (blank title), `404` (task not found / not owned)

---

### `PATCH /api/tasks/:id/subtasks/:subId`
Toggle a subtask's completion state.

**Request body:**
```json
{ "isCompleted": true }
```

**Success `200`:** Updated subtask object.

**Errors:** `404` (subtask not found)

---

### `DELETE /api/tasks/:id/subtasks/:subId`
Delete a subtask.

**Success `204`:** No body.

**Errors:** `404` (subtask not found)

---

## Health Check

### `GET /health`
Exposed by `@fastify/under-pressure`. Returns `503` if server is under load.

**Success `200`:**
```json
{ "status": "ok" }
```

---

## OpenAPI / Swagger UI

### `GET /docs`
Interactive Swagger UI for the full API. Served by `@fastify/swagger-ui`.
- All endpoints are tagged: `Auth`, `Tasks`, `Labels`, `Subtasks`
- Security scheme: `cookieAuth` (`apiKey` in cookie `token`)

---

> ✅ This document was generated from reading `backend/src/routes/*.ts` directly.
