---
stepsCompleted: [1, 2, 3, 4, 5, 6]
inputDocuments: []
date: 2026-02-23
author: Alessio
---

# Product Brief: bmad-todo-app

<!-- Content will be appended sequentially through collaborative workflow steps -->

## Executive Summary

bmad-todo-app is a lightweight, full-stack personal task management application designed for **developers and technical users** who want to plan their day without friction. Most existing task managers overwhelm users with features, impose rigid workflows, and create more overhead than they relieve. bmad-todo-app takes the opposite stance: a focused, fast, and delightful experience that covers the full task lifecycle — create, view, complete, delete — wrapped in a **pixel-art retro UI aesthetic** that makes it immediately distinctive and satisfying to use.

The application features a **non-intrusive end-of-day gamification layer**: users assign a point value to each task and accumulate a daily score, enabling cross-day comparison and personal progress tracking. There are no popups or interruptions — the review is a passive, always-visible summary. Local email/password authentication with persistent long-lived sessions ensures tasks are tied to an account and accessible across devices with no repeated login friction.

---

## Core Vision

### Problem Statement

Personal task management tools have become a source of friction rather than relief. For developers in particular, existing solutions require onboarding, enforce workflows, and demand cognitive overhead that undermines the very productivity they promise to support. They are also visually indistinct — generic, forgettable interfaces that inspire no loyalty or delight.

### Problem Impact

Developers who need simple daily planning are forced to choose between overpowered tools they barely use and informal workarounds (sticky notes, plain text files, terminal aliases) that lack durability, cross-device access, and any sense of reward or progress tracking. This leaves a clear gap: a reliable, portable, lightweight tool that fits naturally into a developer's daily routine — and that's actually enjoyable to use.

### Why Existing Solutions Fall Short

Mainstream task managers cater to power users with projects, priorities, deadlines, labels, and collaboration features. Simpler alternatives feel disposable or lack the technical quality developers notice — poor API design, no persistence guarantees, no auth, or fragile UX. None of them deliver a memorable visual identity, persistent sessions, or a meaningful built-in sense of daily progress.

### Proposed Solution

A focused full-stack Todo application with local email/password authentication and a **retro pixel-art UI**, optimized for desktop use with full usability on smaller screens. Users assign a point value to each task they create, accumulate a daily score as they complete work, and can compare their output across days — all without popups or interruptions. The backend exposes a clean, well-defined REST API with durable persistence, JWT-based session management, and long-lived sessions with email pre-fill so returning users feel zero friction.

### Key Differentiators

- **Retro pixel-art UI** — a distinctive, opinionated aesthetic optimized for desktop, usable on mobile
- **User-assigned task points** — each task carries a personal weight, making the daily score meaningful and comparable across days
- **Non-intrusive gamification** — no popups ever; the daily score is a passive, always-visible summary that rewards without interrupting
- **Cross-device portability** — email/password auth with long-lived sessions and email pre-fill; log in once, stay logged in
- **Built for developers** — clean architecture, inspectable JWT auth API, sub-second performance that technical users expect
- **Radical clarity over feature breadth** — intentionally minimal scope, deliberately polished execution
- **Extensible-by-design architecture** — OAuth, richer gamification mechanics, and advanced features can be layered on without rearchitecting

## Target Users

### Primary Users

#### The Developer Planner

**Profile:** A software developer or technical professional — working independently as a freelancer or as part of a development team — who treats daily task planning as a deliberate professional habit. They are comfortable with technical tools and have strong opinions about what belongs in their workflow.

**Context & Motivation:**
They start their day by writing down what they intend to accomplish, or end their day by preparing tomorrow's task list. This is not reactive capture — it is a conscious planning ritual. They value the act of writing tasks down as a commitment mechanism and find satisfaction in marking things complete at the end of the day.

**Current Workarounds:**
They come from one of two failure modes:
- **Over-structured tools** (Jira, Azure DevOps) — powerful but overkill for personal daily planning; require tickets, workflows, and team context that don't apply to individual day-to-day focus
- **Over-featured tools** (Notion, Obsidian, Confluence) — flexible but bloated; the user spends more time organizing the system than using it

**What They Need:**
A fast, private, personal space to write what they want to do today — nothing more. Completely free-form task entry, no imposed structure, no categories, no priorities unless they choose to express them through point assignment.

**Success Moment:**
They open the app, type their tasks for the day in under a minute, work through them, and close the day seeing their total score. It becomes a lightweight professional ritual that requires no maintenance.

### Secondary Users

N/A — bmad-todo-app is a single-user personal tool. There are no admin, oversight, or collaborative roles in v1.

### User Journey

**Discovery:**
The user is frustrated with their current tool — either Jira feels like overhead for personal tasks, or Notion has become a maintenance burden. They are looking for something minimal and opinionated. They discover bmad-todo-app through word of mouth, a developer community, or a portfolio project reference.

**Onboarding:**
They land on the app, register with email and password in under 30 seconds, and are immediately presented with their (empty) task list. No tutorial, no setup wizard, no configuration. The pixel-art UI signals character and intentionality immediately.

**Core Usage — Morning Ritual:**
At the start of the day, they open the app and type in 3–7 tasks, optionally assigning a point value to each based on perceived importance or effort. They then close the tab and get to work.

**Core Usage — Evening Ritual:**
At the end of the day (or before finishing work), they open the app, mark completed tasks, review their daily score, and optionally create tomorrow's task list. The passive daily score summary gives them a satisfying sense of progress without any additional interaction.

**Aha Moment:**
The first time they see their daily score and realize they can compare it to previous days — or the first time they complete the morning ritual in under 60 seconds and feel the contrast with their old tool.

**Long-term:**
The app becomes a lightweight daily habit. Sessions are persistent so there is no login friction. The retro UI becomes familiar and even enjoyable. Task history and score tracking over time reinforces the habit loop.

## Success Metrics

### User Success Metrics

**Core Interaction Speed:**
A user can add a new task, assign points, and return to their list in under 30 seconds. Marking a task complete is a single interaction. The app supports the natural rhythm of returning multiple times during the day — to check off completed items, review remaining tasks, and plan ahead — without friction.

**Daily Planning Ritual:**
A successful session ends with the user having a clear view of what's done, what remains, and their running score for the day. Planning tomorrow's tasks at end-of-day is equally fast: open the app, type, assign points, done.

**Habit Formation Indicators:**
- User returns to the app multiple times per day (≥2 sessions/day)
- User completes the end-of-day score review
- User creates a new task list on consecutive days (streak behavior)

**Gamification Engagement:**
The point system creates a lightweight addiction loop — users are motivated to complete tasks not just to clear the list, but to improve their daily score. Cross-day score comparison is visible and encourages return visits.

**Recommendation Driver:**
Simplicity is the primary word-of-mouth trigger. A user recommends the app because it does exactly what it promises and nothing else — no setup required, no learning curve.

### Business Objectives

This is a course project. Success is defined by demonstrating full-stack engineering competence, production-quality code standards, and a complete, usable product rather than growth or revenue metrics.

### Key Performance Indicators

The following KPIs define project completion and success:

| KPI | Target | Notes |
|---|---|---|
| **Functional completeness** | All CRUD operations working | Create, read, update (complete), delete tasks — including point assignment |
| **Test coverage** | ≥ 70% meaningful code coverage | Unit and integration tests, not vanity coverage |
| **E2E test suite** | ≥ 5 passing Playwright tests | Covering core user flows: auth, task creation, completion, deletion, score display |
| **Docker deployment** | `docker-compose up` runs the full app | Frontend, backend, and database all containerized |
| **Accessibility** | Zero critical WCAG violations | Validated against WCAG 2.1 — pixel UI must not sacrifice accessibility |
| **Documentation** | Complete project documentation | Setup guide, API reference, architecture overview |

## MVP Scope

### Core Features

#### Authentication
- Email/password registration and login
- Long-lived persistent sessions (remember me by default)
- Email pre-fill on return visits
- Secure JWT-based session management

#### Task Management (Full CRUD)
- **Create** a task with: description, point value, optional deadline, optional label/category
- **View** full task list — active and completed tasks visually distinct
- **Edit** a task after creation (description, points, deadline, label)
- **Complete** a task — single interaction, updates daily score instantly
- **Delete** a task

#### Gamification & Scoring
- User-assigned point value per task (set at creation, editable)
- Running daily score — always visible, updates in real time as tasks are completed
- Cross-day score history — users can review their performance across previous days

#### Labels & Categories
- User-defined labels or categories to organize tasks
- Filter or group tasks by label within the daily view

#### Deadlines
- Optional deadline per task
- Visual indication of tasks with deadlines (due today, overdue)

#### Daily Seed Task (Habit Loop Trigger)
- Every day at midnight, the system automatically generates a seed task for each user: *"Record your first task for today"* with a minimal point value (e.g., 1 point)
- The seed task appears at the top of the task list when the user opens the app, acting as a low-friction entry point to start their daily planning ritual
- The user can complete it as-is to earn the minimal points and confirm their daily check-in
- The user can also delete it if they prefer a fully self-driven list for that day
- **Data model note:** Seed tasks are system-generated records flagged with a `is_system` attribute to distinguish them from user-created tasks — this distinction matters for filtering, scoring, and future analytics

#### UI & Experience
- Retro pixel-art UI aesthetic — desktop-first, fully usable on smaller screens
- Instant UI updates on all task interactions (no full page reloads)
- Sensible empty, loading, and error states
- Zero critical WCAG accessibility violations

### Out of Scope for MVP

| Feature | Rationale |
|---|---|
| OAuth / social login | Adds complexity; email/password covers portability needs |
| Collaboration / sharing | Single-user tool by design in v1 |
| Notifications / reminders | Out of core ritual loop; deadline visual cues are sufficient |
| Task prioritization beyond points | Points already serve as a personal weight system |
| Native mobile app | Responsive web covers mobile use case |
| Leaderboards or social features | Future gamification expansion |

### MVP Success Criteria

The MVP is considered complete when:
- All CRUD operations function correctly including edit, deadline, and label fields
- Daily seed task is auto-generated at midnight and appears correctly for each user
- Authentication flow works end-to-end with persistent sessions
- Daily score and cross-day history display correctly
- ≥ 70% meaningful test coverage achieved
- ≥ 5 Playwright E2E tests passing across core user flows
- Full application runs via `docker-compose up`
- Zero critical WCAG violations
- Documentation complete (setup guide, API reference, architecture overview)

### Future Vision

Post-v1 enhancements to consider:

- **Streak tracking** — consecutive days with completed tasks, reinforcing the daily habit loop
- **Leaderboards** — optional opt-in comparison with other users (social gamification)
- **OAuth / social login** — reduce registration friction further
- **Task templates** — reusable task sets for recurring daily routines
- **Notifications / reminders** — optional end-of-day nudge to log tasks or review score
- **Advanced analytics** — productivity trends, best days, average score over time
- **Mobile native app** — for users who prefer native over web on mobile
