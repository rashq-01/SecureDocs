# MEMORY.md
## SecureDocs — Living Project Memory

**Companion Documents:** `PRD.md` · `ARCHITECTURE.md` · `RULES.md` · `PHASES.md` · `DESIGN.md`

**Purpose of this file:** This is the project's working memory — for the team AND for any AI assistant helping build this. Unlike the other docs (which define plans/standards), this file tracks **what has actually happened**, in what state the project currently is, and why certain decisions were made. Read this file first when resuming work after a break, or when an AI is picking up the project mid-way.

**Rule:** Update this file every time something meaningful changes — a decision is made, a phase is completed, a blocker is hit. This file is only useful if kept current. A stale MEMORY.md is worse than no MEMORY.md, because it actively misleads.

---

## 1. Purpose (Why This Project Exists)

- **What:** SecureDocs — a secure, role-based digital document management system for legal and investigation documents
- **Why:** Built for Smart India Hackathon 2026, Problem Statement **SIH26190** (Ministry of Home Affairs)
- **Core value proposition:** Real engineering (RBAC, audit trails, tamper detection, rate limiting) over flashy AI — chosen deliberately because the team's strength is backend systems engineering, not AI/ML
- **Team's angle:** Reuse proven architecture patterns from an existing production project (NexusChat — a real-time chat system with 5-node horizontal scaling, Redis Pub/Sub, load-tested with k6) to de-risk the build under hackathon time pressure

---

## 2. Memory (Important Context & Decisions)

*This section holds decisions that matter for understanding "why the project looks like this." Append new entries with a date; do not delete old ones (they explain history even after superseded).*

### Decision Log

| Date | Decision | Reasoning |
|---|---|---|
| Project start | Chose PS26190 (Secure Document Management) over PS26129 (System Integration) | PS190 has clearer scope, easier to demo convincingly in 36–48 hrs, no AI dependency required, directly matches team's JWT/auth/backend strength. PS129 was a stronger "story" but riskier execution given limited team size/time. |
| Project start | No AI/ML features in MVP scope | Team is weak in AI implementation; judges for this PS value real security engineering over AI wrapper features; explicitly stated in `PRD.md` Section 5.2 |
| Project start | Tech stack = Node.js/Express/MongoDB/Redis/Socket.IO/Nginx | Matches team's existing, proven skillset (same stack as NexusChat project) — minimizes new-technology risk during hackathon |
| Project start | RabbitMQ marked as stretch goal only | Team wants to learn/showcase it, but core features must not be risked for it — see `PHASES.md` 4.4 |
| Project start | Audit log is append-only, no update/delete code path exists at all | This is a core judged security feature — building the constraint into the API surface (not just documentation) prevents accidental violations under time pressure |
| Project start | UI direction = professional/institutional, NOT the colorful glassmorphism/game-UI style used in team's personal portfolio project | Explicitly different context — SecureDocs is a government security tool, portfolio site is a personal brand showcase. Do not carry portfolio's visual language into this project. See `DESIGN.md`. |
| Project start | 5 roles defined: Admin, IO (Investigating Officer), Reviewer, Legal Liaison, Auditor | Matches realistic MHA document workflow — mirrors how case documents actually move through review/approval in law enforcement context |

| 2026-08-25 | AI Integration via RabbitMQ | Replaced the earlier "no AI" constraint with a targeted LLM-API strategy. To protect core flows, all AI tasks (Summarization, Smart Classification, Anomaly Detection) will run asynchronously via a RabbitMQ worker. This ensures AI features enhance the system without risking latency or stability of core security functions. |
| 2026-08-25 | Hybrid Anomaly Detection | Decided to augment (not replace) the fast, rule-based anomaly detection with a background AI scan that analyzes recent audit logs for complex behavioral patterns. |

---

## 3. What Happened (Log of Major Updates, Changes, Decisions)

*Chronological log — newest entry at the top. Each entry: date, what happened, who/what was involved.*

```
[Template for new entries — copy this block and fill in]

### <DATE>
**What happened:** <short description>
**Details:** <optional longer explanation, links to commits/files if relevant>
**Impact:** <what this changes going forward, if anything>
```

### Log

### 2026-08-25
**What happened:** Adopted `AI_FEATURES.md` as the definitive AI strategy.
**Details:** The project now formally includes AI capabilities (Summarization, Classification, Anomaly Detection) powered by hosted LLM APIs, utilizing RabbitMQ for asynchronous processing.
**Impact:** `docker-compose.yml` must include RabbitMQ. New worker processes will handle AI queues. Core flows (upload, status change) remain synchronous and independent of AI success/failure.

**[Initial Setup]**
- **What happened:** Project documentation suite created — `PRD.md`, `ARCHITECTURE.md`, `RULES.md`, `PHASES.md`, `DESIGN.md`, `MEMORY.md`
- **Details:** Full requirements, system architecture, folder structure, coding rules, phased build plan, and design system defined before any code was written
- **Impact:** Team and any AI assistant now has a complete shared reference — reduces ambiguity and rework during the actual build

*(New entries go above this line as the project progresses)*

---

## 4. Currently Working (Live Status — Keep This Section Current)

**Update this section constantly. This is the single most important section for "what do I do next."**

```
Current Phase:        Phase 0 — Setup & Scaffolding (not yet started)
Last Updated:         <update this timestamp every time you edit this file>
Blocked On:           Nothing currently
Next Immediate Task:  Initialize repo, install dependencies, confirm local run (see PHASES.md Phase 0)
```

### Per-Module Status (update as work progresses)

| Module | Status | Owner | Notes |
|---|---|---|---|
| Setup/Scaffolding | Not started | — | — |
| Auth & JWT | Not started | — | — |
| RBAC Middleware | Not started | — | — |
| Rate Limiting | Not started | — | — |
| Document Upload/CRUD | Not started | — | — |
| Case Management | Not started | — | — |
| Audit Logging | Not started | — | — |
| Real-Time (Socket.IO) | Not started | — | — |
| Tamper Detection | Not started | — | — |
| Dashboard (all roles) | Not started | — | — |
| Frontend Auth Flow | Not started | — | — |
| Docker/Deployment | Not started | — | — |
| RabbitMQ (stretch) | Not started | — | Only attempt if Phases 1–4.3 fully complete |

**Status values to use:** `Not started` → `In progress` → `Built, untested` → `Tested, working` → `Done`

---

## 5. Updates (Running Changelog — Terse, Frequent Entries)

*This is a lighter-weight log than Section 3 — quick one-line entries for smaller changes. Use Section 3 for significant decisions, use this for routine progress notes.*

```
<DATE> — <one line: what changed>
```

### Log
```
(No entries yet — first update goes here once implementation begins)
```

---

## 6. Notes for AI Assistants Resuming This Project

If you are an AI picking up this project mid-way:

1. **Read in this order:** `MEMORY.md` (this file, for current state) → `PRD.md` (what to build) → `ARCHITECTURE.md` (how it's structured) → `RULES.md` (constraints) → `PHASES.md` (what step we're on) → `DESIGN.md` (visual rules)
2. **Check Section 4 above** for exactly what's in progress and what's next — do not assume, do not restart from Phase 0 if it's marked complete
3. **Do not silently deviate** from the tech stack, folder structure, or design system defined in the other docs — if something documented seems wrong given the current code, flag it in Section 3 as a new entry rather than just changing direction unilaterally
4. **Follow `RULES.md` Section 5 (Boundaries of AI)** strictly — especially: do not write final, unreviewed security-critical logic (auth, RBAC, hashing, audit writes) and present it as done without flagging it for human review
5. **Update this file** when you finish something — future sessions (human or AI) depend on this file being accurate

---

*Companion to `PRD.md`, `ARCHITECTURE.md`, `RULES.md`, `PHASES.md`, and `DESIGN.md` — Smart India Hackathon 2026, Problem Statement SIH26190, Ministry of Home Affairs*
