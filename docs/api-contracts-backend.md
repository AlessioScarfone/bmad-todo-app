# API Contracts — Backend

> Part: `backend` | Generated: 2026-02-27 | Scan: Quick (inferred from route filenames + feature spec)

---

## Overview

- **Base path:** `http://localhost:3001` (dev) | container-internal `http://api:3001` (Docker Compose)
- **Protocol:** HTTP/1.1 + JSON (`Content-Type: application/json`)
- **Authentication:** HttpOnly cookie named `token` (JWT HS256). Sent automatically by browser on all requests.
- **Protected routes:** All non-auth routes require a valid `token` cookie. Returns `401` if missing/invalid.
- **Input validation:** TypeBox schemas via Fastify + AJV — returns `400` on invalid input.
- **Error format:** `{ "error": "message string" }` for 4xx/5xx responses.

---

## Auth Routes — `/auth`

### `POST /auth/register`
Register a new user account.

**Request body:**
```json
{ "email": "user@example.com", "password": "secret123" }
```

**Success `201`:**
```json
{ "id": "uuid", "email": "user@example.com" }
```

**Errors:** `400` (validation), `409` (email already registered)

---

### `POST /auth/login`
Authenticate and set JWT cookie.

**Request body:**
```json
{ "email": "user@example.com", "password": "secret123" }
```

**Success `200`:**
```json
{ "id": "uuid", "email": "user@example.com" }
```
Sets `Set-Cookie: token=<JWT>; HttpOnly; SameSite=Lax`

**Errors:** `400` (validation), `401` (invalid credentials)

---

### `POST /auth/logout`
Clear the JWT cookie.

**No request body.**

**Success `200`:**
```json
{ "ok": true }
```
Clears `token` cookie.

---

## Task Routes — `/tasks`

> All routes require authentication (valid `token` cookie).

### `GET /tasks`
List all tasks for the authenticated user.

**Query params (optional):**
| Param | Type | Description |
|---|---|---|
| `status` | `"all"` \| `"completed"` \| `"todo"` | Filter by completion |
| `label` | string (label ID) | Filter by label |
| `deadline` | `"overdue"` \| `"today"` \| `"upcoming"` | Filter by deadline |
| `sort` | `"created"` \| `"title"` \| `"deadline"` | Sort order |

**Success `200`:**
```json
[
  {
    "id": "uuid",
    "title": "Buy groceries",
    "completed": false,
    "deadline": "2026-03-01T00:00:00.000Z",
    "created_at": "2026-02-27T10:00:00.000Z",
    "labels": [{ "id": "uuid", "name": "Shopping", "color": "#00b4d8" }],
    "subtasks": [{ "id": "uuid", "title": "Milk", "completed": false }]
  }
]
```

---

### `POST /tasks`
Create a new task.

**Request body:**
```json
{ "title": "Buy groceries" }
```

**Success `201`:**
```json
{ "id": "uuid", "title": "Buy groceries", "completed": false, "deadline": null, "created_at": "..." }
```

**Errors:** `400` (missing/empty title)

---

### `PATCH /tasks/:id`
Update a task (title, completed state, or deadline).

**Request body (partial update — send only changed fields):**
```json
{ "title": "Updated title" }
{ "completed": true }
{ "deadline": "2026-03-15T00:00:00.000Z" }
{ "deadline": null }
```

**Success `200`:**
```json
{ "id": "uuid", "title": "Updated title", "completed": false, "deadline": null, "created_at": "..." }
```

**Errors:** `400` (validation), `404` (task not found / not owned by user)

---

### `DELETE /tasks/:id`
Delete a task (cascades to subtasks and task_labels).

**Success `204`:** No body.

**Errors:** `404` (task not found / not owned by user)

---

## Label Routes — `/labels`

> All routes require authentication.

### `GET /labels`
List all labels for the authenticated user.

**Success `200`:**
```json
[{ "id": "uuid", "name": "Work", "color": "#ef476f" }]
```

---

### `POST /labels`
Create a new label.

**Request body:**
```json
{ "name": "Work", "color": "#ef476f" }
```

**Success `201`:**
```json
{ "id": "uuid", "name": "Work", "color": "#ef476f" }
```

---

### `DELETE /labels/:id`
Delete a label (also removes from all task_labels entries).

**Success `204`:** No body.

---

### `POST /tasks/:taskId/labels/:labelId`
Attach a label to a task.

**Success `200`:** `{ "ok": true }`

**Errors:** `404` (task or label not found)

---

### `DELETE /tasks/:taskId/labels/:labelId`
Detach a label from a task.

**Success `204`:** No body.

---

## Subtask Routes

> All routes require authentication.

### `POST /tasks/:taskId/subtasks`
Add a subtask to a task.

**Request body:**
```json
{ "title": "Buy milk" }
```

**Success `201`:**
```json
{ "id": "uuid", "task_id": "uuid", "title": "Buy milk", "completed": false, "created_at": "..." }
```

---

### `PATCH /subtasks/:id`
Update a subtask (title or completed).

**Request body (partial):**
```json
{ "completed": true }
{ "title": "Updated subtask" }
```

**Success `200`:** Updated subtask object.

---

### `DELETE /subtasks/:id`
Delete a subtask.

**Success `204`:** No body.

---

## Health Check

### `GET /health`
Exposed by `@fastify/under-pressure`. Returns `503` if server is under excessive load.

**Success `200`:**
```json
{ "status": "ok" }
```

---

> ⚠️ Route paths and request/response shapes were inferred from route filenames and the PRD/story specifications. For authoritative schemas, read `backend/src/routes/*.ts`.
