---
stepsCompleted: [step-01-init, step-02-discovery, step-02b-vision, step-02c-executive-summary, step-03-success, step-04-journeys, step-05-domain, step-06-innovation, step-07-project-type, step-08-scoping, step-09-functional, step-10-nonfunctional, step-11-polish]
inputDocuments: ['_bmad-output/planning-artifacts/product-brief-bmad-todo-app-2026-02-23.md']
workflowType: 'prd'
briefCount: 1
researchCount: 0
brainstormingCount: 0
projectDocsCount: 0
classification:
  projectType: web_app
  domain: general
  complexity: low
  projectContext: greenfield
lastEdited: '2026-02-23'
editHistory:
  - date: '2026-02-23'
    changes: 'Removed duplicate sections (lines 300–619); added Journey 5 (Score History Review) and Journey 6 (Filtered Task View); added FR36 (Daily Seed Task with is_system flag); updated Journey Requirements Summary; fixed FR34 (measurability) and Accessibility NFR (confirmation affordance)'
---

# Product Requirements Document - bmad-todo-app

**Author:** Alessio
**Date:** 2026-02-23

## Executive Summary

bmad-todo-app is a lightweight, full-stack personal task management web application built for developers who treat daily planning as a deliberate professional ritual. It covers the complete task lifecycle — create, view, complete, delete — with a pixel-art-inspired retro UI aesthetic that makes it immediately distinctive. Users assign a personal point value to each task; completing tasks accumulates a daily score displayed persistently in the UI. There are no popups, no interruptions, and no configuration overhead. Local email/password authentication with JWT-based long-lived sessions and email pre-fill means users log in once and stay productive.

The project serves a dual purpose: a production-quality personal tool the author intends to use daily and share as a portfolio artifact, built with the engineering discipline that implies — clean REST API, durable persistence, and inspectable auth.

### What Makes This Special

- **Purposeful simplicity with just enough structure.** Tasks support free-form labels, an optional deadline (date), and optional subtasks. All are lightweight and opt-in — the app never enforces structure or demands organization before letting you add a task.
- **Intrinsic, non-intrusive gamification.** User-assigned task points create a meaningful personal score — purely reflective, never social. The score accumulates as tasks are completed and is always visible; no action required to see it.
- **Retro-but-practical aesthetic.** Pixel-art inspired but not dogmatically 8-bit — informed by what the chosen frontend component library can support, keeping the style distinctive without becoming a maintenance burden.

The core insight: the best productivity tool for a developer demands zero maintenance and delivers a small, consistent daily ritual with a satisfying feedback loop.

## Project Classification

- **Project Type:** Full-stack web application (SPA frontend + REST API backend)
- **Domain:** General productivity — developer tooling
- **Complexity:** Low — CRUD with optional labels, deadlines, and subtasks; JWT authentication; passive gamification layer
- **Project Context:** Greenfield

## Success Criteria

### User Success

- Task entry is frictionless — from "I have tasks to add" to "tasks are in the app" in under 60 seconds
- The daily score is permanently visible on the page (e.g., sidebar) and updates on each task state change — no user action required
- Long-lived JWT sessions with email pre-fill eliminate login friction on return visits
- Labels, deadlines, and subtasks are quick to attach and never block the core flow of adding or completing tasks
- The pixel-art-inspired UI signals intentionality — immediately recognizable as distinctive on first visit

### Business / Personal Success

- **Daily use:** The app becomes part of Alessio's daily planning ritual — used consistently as a real personal productivity tool
- **Portfolio quality:** The codebase and product are shareable publicly — in a portfolio, job interview, or developer community context
- **Learning outcomes:** The project demonstrates mastery of the chosen tech stack — architecture, auth, testing, and deployment patterns that reflect production discipline

### Technical Success

- All CRUD operations for tasks (including labels, deadlines, subtasks) are fully functional
- Minimum **70% meaningful code coverage** across the test suite
- Minimum **5 passing Playwright E2E tests** covering core user flows
- Application runs successfully via **`docker-compose up`** with no manual steps beyond that command
- **Zero critical WCAG 2.1 AA violations**
- Sub-second response times for all core interactions under normal load

### Measurable Outcomes

| Outcome | Target |
|---|---|
| Core CRUD functionality | 100% working |
| Unit/integration test coverage | ≥ 70% meaningful coverage |
| Playwright E2E tests passing | ≥ 5 tests |
| Docker deployment | `docker-compose up` succeeds end-to-end |
| WCAG 2.1 AA critical violations | 0 |
| Task-to-app time | < 60 seconds |
| Page load / interaction response | < 1 second |

## User Journeys

### Journey 1: The Developer Planner — First Day (Success Path)

**Persona:** Marco is a freelance backend developer. He's been using Jira at his client's office all week — ticket statuses, sprint boards, backlog grooming. By Friday afternoon he sits down to plan his weekend side project work and opens Jira out of habit. He immediately closes it. He does not need a sprint board to remember that he wants to write tests and fix a CSS bug.

He finds bmad-todo-app.

**Registration:** Marco lands on the app. The pixel-art aesthetic is immediately different from every productivity tool he's seen — it doesn't look corporate. He registers with email and password in under 30 seconds. No onboarding wizard, no tutorial modal. He's on his task list.

**First task:** He types "Write unit tests for auth module" and assigns it 3 points. Adds a label "Backend". Hits enter. The task appears instantly.

**Building the list:** He adds three more tasks in under a minute: a 1-point "fix login button CSS" with a "Frontend" label, a 2-point "review PR from teammate" with a deadline for Sunday, and a 5-point "refactor API error handling" with two subtasks: "map error codes" and "update response schema".

**Working through the day:** As he completes each task, he marks it done. The sidebar score updates after each completion. By evening he has 9 points. He closes the laptop. The ritual is complete.

**New reality:** Marco opens the app Monday morning. His email is pre-filled. One click and he's in. This becomes his daily habit.

---

### Journey 2: The Developer Planner — Return Visit (Session Continuity)

**Persona:** Same Marco, three weeks later.

**The moment:** Marco opens his laptop at 8am. He navigates to bmad-todo-app. His email is already in the field — he clicks Login and he's on his task list in two seconds. Yesterday's completed tasks are marked done. He starts typing today's first task.

**What didn't happen:** No password reset. No re-entering credentials. No session-expired banner. The app was just there.

**Requirements revealed:** Long-lived JWT sessions, email pre-fill on return, persistent task state across sessions.

---

### Journey 3: The Developer Planner — Rich Task (Labels, Deadline, Subtasks)

**The moment:** Marco has a client deliverable due Thursday. He creates a task: "Deliver API integration" — assigns 8 points, adds label "Client", sets deadline to Thursday's date. He expands it with three subtasks: "Write endpoint", "Write tests", "Deploy to staging".

He checks off subtasks during the day. The parent task stays incomplete until he explicitly marks it done — earning the full 8 points.

**Requirements revealed:** Subtask completion is independent from parent. Parent points are awarded on parent completion. Deadline is visible on the task card. Labels are visually distinct.

---

### Journey 4: The Developer Planner — Edge Case (Error Recovery)

**The moment:** Marco is on a flaky coffee shop Wi-Fi. He types a task and hits enter. The app shows an inline error: "Couldn't save. Tap to retry." He taps retry. It saves. He continues.

**Alternative:** He accidentally deletes a task. There's no undo. He recreates it in five seconds — the app is fast enough that accidental deletion is a minor inconvenience, not a crisis.

**Requirements revealed:** Graceful error handling with inline feedback, fast task creation as the recovery UX.

---

### Journey 5: The Developer Planner — Score History Review

**Persona:** Same Marco, four weeks in.

**The moment:** It's Friday afternoon. Marco opens the app and, instead of jumping to today's task list, he navigates to his score history. He sees a week of daily scores — Monday was a 14-point day, Tuesday a quiet 4, Wednesday a strong 11. He notices the pattern: mornings with a pre-built task list produce higher scores than days he flies blind.

**What he does:** He glances at last Friday's score to benchmark against this week, then closes the view and returns to today's list with a renewed sense of intention.

**Requirements revealed:** Persistent daily score records, score history view across multiple previous days, ability to compare scores across calendar days.

---

### Journey 6: The Developer Planner — Filtered Task View

**Persona:** Same Marco, mid-afternoon on a busy day.

**The moment:** Marco has 12 tasks in his list — a mix of client work, personal projects, and admin. He needs to focus only on client-labelled tasks for the next two hours. He selects the "Client" label filter. The list collapses to 3 tasks. He works through them without distraction, then clears the filter to see the full list again.

**Alternative:** He wants to review only what he's already completed before signing off — he filters by completion status to see his done tasks and the score they generated.

**Requirements revealed:** Filter task list by label, filter by completion status, filter by deadline, sort by label/deadline/completion status. Filters are temporary and non-destructive — clearing returns the full list.

### Journey Requirements Summary

| Capability | Revealed By |
|---|---|
| Email/password registration and login | Journey 1 |
| Long-lived JWT sessions + email pre-fill | Journey 2 |
| Task CRUD with point assignment | Journeys 1, 3 |
| Free-form labels | Journeys 1, 3 |
| Optional deadline (date) per task | Journey 3 |
| Optional subtasks (independent completion) | Journeys 1, 3 |
| Daily score in persistent sidebar, updates on action | Journey 1 |
| Persistent task state across sessions | Journey 2 |
| Inline error feedback with retry | Journey 4 |
| Fast task creation as primary recovery UX | Journey 4 |
| Daily score history (persistent per-day record) | Journey 5 |
| Score history view across previous days | Journey 5 |
| Cross-day score comparison | Journey 5 |
| Filter task list by label | Journey 6 |
| Filter task list by completion status | Journey 6 |
| Filter task list by deadline | Journey 6 |
| Sort task list by label, deadline, or completion status | Journey 6 |

## Project Scoping & Phased Development

### MVP Strategy & Philosophy

**MVP Approach:** Experience MVP — the minimum that is genuinely useful and delightful for daily personal use by a solo developer.
**Resource Requirements:** Solo developer. Architecture and feature scope must remain manageable for a single person to build, test, and ship.

### MVP Feature Set (Phase 1)

**Core User Journeys Supported:**
- First-time registration and onboarding
- Daily task list creation and management
- Task completion with score accumulation
- Return visit with frictionless session continuity

**Must-Have Capabilities:**
- Email/password authentication with JWT long-lived sessions and email pre-fill
- Task CRUD: create, view, complete, delete
- Task enrichment: user-assigned point value, free-form labels, optional deadline (date), optional subtasks (flat, one level)
- Daily score: persistent sidebar display, updates on task state change
- Daily score history — view and compare scores across days
- Task filtering and sorting by label, deadline, or completion status
- Pixel-art-inspired UI using available component library
- REST API with durable persistence
- Docker Compose deployment
- WCAG 2.1 AA — zero critical violations
- ≥ 70% meaningful test coverage; ≥ 5 Playwright E2E tests

### Post-MVP Features

**Phase 2 (Growth):**
- OAuth authentication (Google, GitHub)
- PWA support for mobile usability
- Richer gamification: streaks, milestones, personal records

**Phase 3 (Vision):**
- Public opt-in score sharing
- Advanced gamification — badges, goals, weekly summaries
- Browser extension for quick capture
- Developer tool integrations (e.g., GitHub issues → tasks)

### Risk Mitigation Strategy

**Technical:** Keep the pixel-art aesthetic within what the chosen component library can express — no bespoke CSS art projects. Subtasks are flat, one level only.
**Scope:** Score history and filtering are in MVP — architecture should account for this from day one.
**Resource:** Solo developer means no micro-service architecture — monolithic backend, single deployable unit per service.

## Web App Specific Requirements

### Architecture

- **SPA** — client-side routing, no full-page reloads after initial load
- **Frontend/backend decoupling** — SPA communicates with backend exclusively via REST API (JSON); no server-side rendering
- **Score updates** — daily score recalculates and re-renders on task state changes via fetch + state update; no WebSocket or SSE required
- **No SEO** — all content is authentication-gated; public pages (login, register) require no SEO optimization

### Browser Support

- Modern evergreen browsers only: Chrome, Firefox, Safari, Edge (latest stable)
- No legacy browser support

### Responsive Design

- Desktop-optimized as primary layout
- Fully usable on smaller screens; no dedicated mobile-first design pass in v1

### Deployment

- Frontend served as static build via Docker Compose; backend as containerized service
- No manual configuration required beyond `docker-compose up`

## Functional Requirements

### Authentication & Session Management

- **FR1:** Unregistered users can create an account with email and password
- **FR2:** Registered users can log in with email and password
- **FR3:** The system maintains user sessions across browser restarts without requiring re-authentication
- **FR4:** The login form pre-fills the user's email address on return visits
- **FR5:** Authenticated users can log out

### Task Management

- **FR6:** Authenticated users can create a new task with a title
- **FR7:** Authenticated users can view all their tasks
- **FR8:** Authenticated users can mark a task as complete
- **FR9:** Authenticated users can un-complete a previously completed task
- **FR10:** Authenticated users can delete a task
- **FR11:** Authenticated users can edit an existing task's title
- **FR12:** Authenticated users can assign a point value to a task at creation time
- **FR13:** Authenticated users can update the point value of an existing task

### Task Enrichment

- **FR14:** Authenticated users can attach one or more free-form labels to a task
- **FR15:** Authenticated users can remove a label from a task
- **FR16:** Authenticated users can set an optional deadline date on a task
- **FR17:** Authenticated users can remove the deadline from a task
- **FR18:** Authenticated users can add subtasks to a task
- **FR19:** Authenticated users can mark individual subtasks as complete independently
- **FR20:** Authenticated users can delete a subtask
- **FR21:** Subtasks are limited to one level of nesting (no nested subtasks)
- **FR22:** Completing all subtasks does not automatically complete the parent task

### Gamification & Scoring

- **FR23:** The system displays the user's accumulated daily score persistently on every page of the authenticated app
- **FR24:** The daily score increases when a task is marked complete, by that task's assigned point value
- **FR25:** The system records the user's total score for each calendar day
- **FR26:** Authenticated users can view their score history across previous days
- **FR27:** Authenticated users can view a chronological list of daily scores for up to 30 previous calendar days

### Organisation & Discovery

- **FR28:** Authenticated users can filter their task list by label
- **FR29:** Authenticated users can filter their task list by completion status
- **FR30:** Authenticated users can filter their task list by deadline
- **FR31:** Authenticated users can sort their task list by label, deadline, or completion status

### User Experience & Feedback

- **FR32:** The system provides inline error feedback when a task action fails
- **FR33:** Users can retry a failed task action without re-entering data
- **FR34:** The system reflects task state changes within 1 second after each action without a full page reload
- **FR35:** All core flows are operable via keyboard navigation

### System Automation

- **FR36:** The system automatically creates a daily seed task — titled "Record your first task for today" (1 point) — for each user at the start of each calendar day; the task appears at the top of the task list and can be completed or deleted by the user

> **Data model note:** Seed tasks are system-generated records identified by an `is_system` flag, distinguishing them from user-created tasks for filtering, scoring, and future analytics purposes.

## Non-Functional Requirements

### Performance

- All user-initiated task actions (create, complete, delete, edit) complete and reflect in the UI within 1 second under normal network conditions
- Initial page load completes within 3 seconds on a standard broadband connection
- The daily score updates and renders within 500ms of a task state change

### Security

- All API communication occurs over HTTPS
- Passwords are stored hashed using a modern algorithm (e.g., bcrypt)
- JWT tokens are validated server-side on every authenticated request
- Users can only access their own tasks and data — no cross-user data leakage
- No sensitive data (passwords, raw tokens) is logged

### Accessibility

- The application meets WCAG 2.1 AA compliance — zero critical violations
- All interactive elements are keyboard navigable
- Color contrast ratios meet AA thresholds throughout the pixel-art-inspired theme
- Destructive actions (delete) require explicit user confirmation before execution (e.g., a confirmation dialog or equivalent two-step action)

### Reliability

- Task data is persisted durably — no data loss on page refresh or browser restart
- The application behaves gracefully on network failure — inline error feedback, no silent data loss
- The Docker Compose deployment starts successfully from a clean environment with no manual configuration beyond `docker-compose up`


