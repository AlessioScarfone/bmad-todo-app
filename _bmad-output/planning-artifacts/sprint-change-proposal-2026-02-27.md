# Sprint Change Proposal — 2026-02-27

**Project:** bmad-todo-app  
**Proposed by:** Alessio  
**Date:** 2026-02-27  
**Status:** Approved & Implemented

---

## Change Summary

Replace hover-reveal edit/delete buttons on task cards with permanently visible icon buttons, aligned to the right side of each card. Change applies to both desktop and mobile viewports.

---

## Trigger

UX feedback: hover-reveal buttons are inaccessible on touch devices (mobile) and create a discoverability gap — users cannot find edit/delete actions without already knowing they exist.

---

## Change Description

| | Before | After |
|---|---|---|
| Edit button (✎) | Visible only on `group-hover:` (hidden by default, `opacity-0`) | Always visible (`text-[#888]`, color brightens on hover) |
| Delete button (✕) | Visible only on `group-hover:` (hidden by default, `opacity-0`) | Always visible (`text-[#888]`, turns red on hover) |
| Mobile support | Buttons unreachable without hover | Fully accessible on touch |

---

## Impact Analysis

### Code Changes
- **`frontend/src/components/TaskRow.tsx`** — Removed `opacity-0 group-hover:opacity-100 motion-safe:transition-opacity` from both the edit and delete `<button>` classNames. Added `shrink-0` to prevent buttons from collapsing on narrow viewports.

### Planning Artifact Updates
- **Story 2.4 (Edit Task Title)** — Task 5 implementation note updated: edit icon is now permanently visible, not hover-triggered.
- **Story 2.5 (Delete Task)** — AC1 rewritten: removed "hover-reveal" language, now describes permanently visible delete icon button.

### No Impact On
- Backend API — no changes
- Architecture — no changes
- Authentication / session management — no changes
- All other stories and epics — no changes

---

## Checklist

- [x] Change clearly defined
- [x] Root cause identified (mobile inaccessibility)
- [x] Code implemented
- [x] Affected stories updated (2.4, 2.5)
- [x] No regression to existing features (toggle, confirm-delete flow, keyboard nav, ARIA labels)
- [x] No new story or epic required — change is a targeted UI refinement on done stories

---

## Decision

Change implemented directly. No sprint scope change required — this is a refinement to completed work within the same sprint cadence.
