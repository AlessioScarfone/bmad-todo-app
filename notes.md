# Final notes — BMAD Todo App

> Course: AINE Program: Spec-Driven Development (SDD) for Engineers
> Project: bmad-todo-app
> Date: February 2026

---

## Overview

I used this project to put BMAD through its paces on a deliberately simple domain. A todo app is boring by design. The point wasn't to build something interesting; it was to observe the methodology clearly, without a complex problem getting in the way. What follows is an honest account of what worked, what dragged, and where I ended up surprised.

---

## Phase 1 — Analysis and Planning

### Brainstorming and requirements

The **analysis phase** is long. I won't pretend otherwise. For a todo app it can feel absurd: you're producing PRDs and architecture documents for something a senior developer could skeleton out in a weekend. The payoff is harder to see at this scale. But I think that's the wrong comparison. What happens when you apply the same rigor to a project that actually warrants it? I think the upfront investment becomes proportionally more valuable as scope grows. Here it was over-engineered on purpose.

What actually surprised me was the **brainstorming / brief prd** phase. I expected it to be a warm-up, a way to generate a list of features. What I got instead were uncomfortable questions about whether what I was building was worth building at all. That's the kind of conversation that usually doesn't happen until something has already been shipped and the feedback is bad.

The **PRD** phase was useful in a different way. Most places I've worked have had vague or partial requirements and documentation that exists somewhere between sparse and nonexistent. That's the real baseline to compare against — not a well-run product team with a full-time PM. Against that baseline, having a structured artifact that defines *what* to build before anyone touches a file is a meaningful improvement. The agent continually references it throughout implementation to maintain direction.

The **architectural** phase is where I'd argue the time investment is clearest even for small projects. Making technology decisions early, when nothing is locked in, is just cheaper. BMAD pushes you to do it as early as possible.

The UX agent was the most unexpected part. It generates HTML wireframes alongside the UX design document. I used it twice: once initially, and once after I removed the scoring feature and replaced it with a simple task count (`3/5 tasks completed`). Both outputs were useful and updated cleanly.

## Friction

Instructions didn't always stick on the first pass. The clearest case was MVP scope definition. I needed to move a feature from the MVP phase to a later phase, and I had to repeat the request several times before the model applied it consistently. In a long session with a lot of context, this kind of drift is annoying. Perhaps it improves with more performant model. Throughout the entire process, I always used `Claude Sonnet 4.6` or `GPT 5.3 Codex`.

The token cost is also real. Producing a PRD, architecture documents, UX specs, data models, and API contracts generates a large volume of files. Reading and validating all of it takes time. I'd argue it's still worth spending, but you should go in knowing the upfront cost is significant.

---

## Phase 2 — Implementation

The implementation phase has four main stages:

1. Story creation: Bob (Scrum Master) reads the planning artifacts and produces a detailed story with tasks and acceptance criteria.
2. Development: Amelia (Developer) implements the story, following code conventions and writing unit tests.
3. QA automation: Quinn (QA Engineer) generates end-to-end tests for the implemented functionality.
4. Code review: Amelia does an adversarial review of her own implementation, flagging and auto-fixing issues.

### Running stages one at a time

On any real project, these stages need human review gates between them. You review the story before implementing it. You review the implementation before generating tests. If an earlier stage goes sideways, the later stages make it worse. Running the pipeline end-to-end without checking is how you end up with a lot of confident, wrong output.

One thing I found helpful during implementation: it helps to split the development stage further. Rather than asking Agent to implement an entire story at once, I'd ask it to implement only the backend tasks, review the result manually, fix anything needed, and then proceed with the frontend tasks. This makes each review pass much more tractable.

E2E test generation was the hardest part for the AI throughout this project. The combination of asynchronous UI timing, test environment setup, and the need for specific selectors produced output that required more debugging/fix cycles than anything else. AI is good at unit testing, E2E tests seem more challenging.

### Automating the pipeline with `bmad-auto-agent`

Since I was studying the methodology more than trying to ship a product, I used this project to try something I'd been curious about: automating all four stages with a custom Copilot agent.

The agent, [Auto-Alessio](.github/agents/bmad-auto-agent.agent.md), is defined as a `.agent.md` file and uses the `agents` tool to hand each stage off to the appropriate specialist agent:

| Stage | Agent | Persona |
|---|---|---|
| Create story | `bmad-agent-bmm-sm` | Bob, Scrum Master |
| Implement | `bmad-agent-bmm-dev` | Amelia, Developer |
| QA | `bmad-agent-bmm-qa` | Quinn, QA Engineer |
| Code review | `bmad-agent-bmm-dev` | Amelia, Developer |

The agent supports two modes. In single-process mode it adopts each agent's persona within the same conversation, which is faster and avoids context switching. In sub-agent mode, each stage runs in a separate Copilot subagent instance with its own context. I ran it both ways. Single-process increases the chances of reaching the limits of the context.

The pipeline runs without confirmation prompts or pauses between stages ("YOLO mode"). When the code review stage asks what to do with findings, it always auto-fixes. The orchestrator passes outputs from each stage as structured context variables into the next one, and generates a summary report at the end.

> [!CAUTION] 
> For a study context this was worthwhile. I got to observe the full pipeline several times without the overhead of manually launching each stage. The obvious risk is that without human review gates, errors don't get caught. Stage 2 can silently inherit a bad story from Stage 1. For anything beyond exploration, I wouldn't run it this way.

---

## Phase 3 — Documentation

The tech writer agent (Paige) scans the entire project, including the codebase, planning artifacts, and implementation stories, and generates documentation: architecture diagrams, API contracts, data model references, component inventories, integration guides.

What makes this worth mentioning is that it's re-runnable. When the project changes, you run the agent again and get updated documentation. I didn't have to manually keep anything in sync. For teams where documentation drifts because no one has time to update it.

---

## Summary

| Aspect | Assessment |
|---|---|
| Upfront analysis overhead | High, but justified at meaningful project scale |
| Quality of planning artifacts | High: structured, actionable, cross-referenced |
| Token consumption | High: a real cost, not just a footnote |
| Instruction reliability | Generally good, with some drift in long sessions |
| Implementation quality | Good; E2E tests needed the most correction/fix sessions |
| Documentation generation | Practically reusable piece |