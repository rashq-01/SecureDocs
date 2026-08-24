# PHASES.md
## SecureDocs — Implementation Roadmap

**Companion Documents:** `PRD.md` (requirements) · `ARCHITECTURE.md` (system design) · `RULES.md` (standards)

**Purpose:** This document breaks the build into sequential phases so the team knows exactly what to build, in what order, and how to verify each phase is actually working before moving to the next. Each phase has a clear exit checklist — do not move to the next phase until the current one passes its checklist.

**Total time budget:** 36–48 hours (adjust hour estimates to your actual hackathon duration)

---

## Phase Overview

| Phase | Name | Est. Time | Owner Type |
|---|---|---|---|
| 0 | Setup & Scaffolding | 1–2 hrs | Whole team |
| 1 | Authentication & Authorization | 4–5 hrs | Backend |
| 2 | Dashboard (Role-Based) | 3–4 hrs | Frontend + Backend |
| 3 | Core CRUD — Documents & Cases | 6–8 hrs | Backend + Frontend |
| 4 | Additional Features (Audit, Real-Time, Tamper Detection) | 6–8 hrs | Backend + Frontend |
| 5 | Testing, Hardening & Demo Prep | 4–6 hrs | Whole team |

---

## Phase 0 — Setup & Scaffolding

**Goal:** Every team member can run the project locally before writing a single feature.

### Tasks
- [ ] Initialize Git repo, set up `.gitignore` (`node_modules`, `.env`, `/uploads`)
- [ ] Create folder structure exactly as defined in `ARCHITECTURE.md` Section 3
- [ ] Backend: `npm init`, install approved dependencies from `RULES.md` Section 3.1
- [ ] Frontend: Vite + React + Tailwind scaffold, install approved dependencies from `RULES.md` Section 3.2
- [ ] Set up `.env.example` (backend) per `ARCHITECTURE.md` Section 9 — each member creates their own `.env`
- [ ] Set up MongoDB (local or Atlas) and Redis (local or cloud) — confirm connection from `config/db.js` and `config/redis.js`
- [ ] Set up `docker-compose.yml` skeleton (even if not fully used until Phase 5)
- [ ] Set up ESLint + Prettier config, shared across the team
- [ ] Create empty model files (`User`, `Document`, `Case`, `AuditLog`) with schemas from `ARCHITECTURE.md` Section 5
- [ ] Confirm: `npm run dev` starts backend without errors, `npm run dev` starts frontend without errors

### Exit Checklist (must pass before Phase 1)
- [ ] Every team member has cloned the repo and run it locally successfully
- [ ] MongoDB connection confirmed (log on server start: "MongoDB connected")
- [ ] Redis connection confirmed (log on server start: "Redis connected")
- [ ] Folder structure matches `ARCHITECTURE.md`
- [ ] `permissionMatrix.js` skeleton exists (even if empty/draft) — this is needed before Phase 1 RBAC work

---

## Phase 1 — Authentication & Authorization

**Goal:** Users can log in, receive a JWT, and the system enforces role-based access on protected routes. This is the security foundation everything else depends on.

### 1.1 Backend Tasks
- [ ] Implement `User` model (per `ARCHITECTURE.md` 5.1)
- [ ] Implement `auth.service.js` — password hashing (bcrypt), JWT signing (access + refresh)
- [ ] Implement `POST /auth/login` — validate credentials, issue tokens, log `AuditLog` entry (`Login` / `LoginFailed`)
- [ ] Implement `POST /auth/refresh` — issue new access token from valid refresh token
- [ ] Implement `POST /auth/logout` — blacklist current access token in Redis
- [ ] Implement `verifyJWT.middleware.js` — validate token signature, expiry, and Redis blacklist check
- [ ] Implement `rateLimiter.middleware.js` — Redis-backed, apply to `/auth/login` (max 5 attempts / 15 min)
- [ ] Define `permissionMatrix.js` — full role × action table (Admin, IO, Reviewer, LegalLiaison, Auditor)
- [ ] Implement `rbac.middleware.js` — reads `permissionMatrix.js`, checks `req.user.role` against required permission for the route
- [ ] Seed script (`scripts/seed.js`): create one demo user per role with known credentials for testing/demo

### 1.2 Frontend Tasks
- [ ] Build `Login.jsx` page — email/password form
- [ ] Build `AuthContext.jsx` — stores JWT, user role, exposes login/logout functions
- [ ] Build `ProtectedRoute.jsx` — redirects to login if no valid token
- [ ] Build `RoleGate.jsx` — conditionally renders children based on role (used later in Phase 2+)
- [ ] Axios interceptor in `services/api.js` — attaches JWT to every request, handles 401 by attempting token refresh

### Exit Checklist (must pass before Phase 2)
- [ ] Can log in as each of the 5 seeded demo users (Admin, IO, Reviewer, LegalLiaison, Auditor)
- [ ] Invalid credentials return `401` with correct error code (`AUTH_INVALID_CREDENTIALS`)
- [ ] 6th rapid failed login attempt returns `429` (`RATE_LIMIT_EXCEEDED`) — rate limiting confirmed working
- [ ] A protected test route correctly returns `403` when accessed by a role without permission
- [ ] A protected test route correctly returns `401` when accessed with no token / expired token
- [ ] Logout invalidates the token — a request with the "logged out" token is rejected
- [ ] Every login attempt (success and failure) appears in the `auditLogs` collection

---

## Phase 2 — Dashboard (Role-Based)

**Goal:** Each role, on login, sees a dashboard relevant to their responsibilities. This phase proves RBAC extends into the UI, not just the API.

### 2.1 Backend Tasks
- [ ] Implement `GET /admin/dashboard-stats` — total documents, documents by status, active users, recent activity count (Admin only)
- [ ] Implement scoped stats logic for IO (their assigned cases summary) and Reviewer (pending review count for their department)
- [ ] Confirm all dashboard-stat endpoints go through `rbac.middleware.js`

### 2.2 Frontend Tasks
- [ ] Build `Dashboard.jsx` — router component that renders the correct dashboard based on `user.role` from `AuthContext`
- [ ] Build `AdminDashboard.jsx` — system-wide stats cards, recent activity placeholder (real-time wiring comes in Phase 4)
- [ ] Build `IODashboard.jsx` — list of assigned cases, quick upload shortcut
- [ ] Build `ReviewerDashboard.jsx` — pending-review queue
- [ ] Build `AuditorDashboard.jsx` — placeholder linking to audit log view (full implementation in Phase 4)
- [ ] Build `Navbar.jsx` — shows role-appropriate nav links using `RoleGate.jsx`

### Exit Checklist (must pass before Phase 3)
- [ ] Logging in as each role lands on a visually distinct, role-appropriate dashboard
- [ ] Admin dashboard shows real numbers from the database (not hardcoded placeholders)
- [ ] A non-Admin user cannot access `/admin/dashboard-stats` directly via API (test with Postman/curl, not just UI)
- [ ] Navbar only shows links/actions relevant to the logged-in role

---

## Phase 3 — Core CRUD: Documents & Cases

**Goal:** The actual document lifecycle works end-to-end — upload, list, view, status transitions — with RBAC and hashing enforced correctly.

### 3.1 Backend Tasks — Cases
- [ ] Implement `Case` model (per `ARCHITECTURE.md` 5.2)
- [ ] `POST /cases` — create case (Admin only)
- [ ] `GET /cases` — list cases (Admin, Reviewer)
- [ ] `PATCH /cases/:id/assign` — assign officers to a case (Admin only)

### 3.2 Backend Tasks — Documents
- [ ] Implement `Document` model (per `ARCHITECTURE.md` 5.3)
- [ ] Implement `hash.service.js` — SHA-256 generation and verification functions
- [ ] Implement `upload.middleware.js` (Multer config — file type whitelist, size limit)
- [ ] `POST /documents` — upload document (IO, Admin) — hash on upload, save metadata, status = `Draft`, write AuditLog
- [ ] `GET /documents` — list/search documents, **scoped by RBAC** (IO sees only their case docs, Reviewer sees department docs, Admin sees all)
- [ ] `GET /documents/:id` — get single document metadata (RBAC-checked)
- [ ] `GET /documents/:id/download` — serve file, **recompute hash and compare before serving**, write AuditLog (View/Download)
- [ ] `PATCH /documents/:id/status` — lifecycle transition (Reviewer, Admin only) — validate allowed transitions (`Draft→UnderReview→Approved/Rejected→Archived`), write AuditLog

### 3.3 Frontend Tasks
- [ ] Build `DocumentUpload.jsx` — form with Case ID selector, document type, classification level, file picker
- [ ] Build `DocumentList.jsx` — table/list view with search & filter (Case ID, status, date range)
- [ ] Build `DocumentDetail.jsx` — metadata view, download button, status-change controls (only visible to Reviewer/Admin via `RoleGate`)
- [ ] Wire up `document.api.js` service functions

### Exit Checklist (must pass before Phase 4)
- [ ] IO can upload a document tied to their assigned case
- [ ] IO attempting to view/download a document from a case NOT assigned to them gets `403`
- [ ] Reviewer can see all documents pending review in their department
- [ ] Reviewer can move a document from `Draft` → `UnderReview` → `Approved`
- [ ] An invalid status transition (e.g., `Draft` → `Archived` directly) is rejected
- [ ] Every upload, view, download, and status change writes a correct `AuditLog` entry
- [ ] Document search/filter works and results are still RBAC-scoped

---

## Phase 4 — Additional Features

**Goal:** The features that make this project stand out in judging — audit trail visibility, real-time updates, and tamper detection — are fully wired and demoable.

### 4.1 Audit Log Viewer
- [ ] Backend: `GET /audit-logs` with filters (actor, document, action type, date range) — Auditor, Admin only
- [ ] Frontend: `AuditLogTable.jsx` — filterable, sortable table
- [ ] Confirm: no update/delete route exists anywhere for the `AuditLog` collection (manual code review — see `RULES.md` 2.1)

### 4.2 Real-Time Activity Feed (Socket.IO)
- [ ] Backend: `sockets/index.js` — Socket.IO server init, JWT verification on socket handshake
- [ ] Backend: `sockets/activity.socket.js` — room join logic (`admin-room`, `dept:<name>`, `case:<caseId>`) based on role
- [ ] Backend: emit `activity:new` from every audit-logging point (upload, view, download, status change)
- [ ] Frontend: `SocketContext.jsx` — connects, joins appropriate rooms based on role
- [ ] Frontend: `ActivityFeed.jsx` — renders live feed, auto-updates on `activity:new` event
- [ ] Test: two browser windows (different roles), perform action in one, confirm instant update in the other where scope allows

### 4.3 Tamper Detection
- [ ] Confirm `hash.service.js` recomputation runs on every `GET /documents/:id/download`
- [ ] On mismatch: set `tamperFlag: true` on the document, write `AuditLog` entry with action `TamperDetected`, emit `tamper:alert` socket event
- [ ] Frontend: `TamperAlertBadge.jsx` — visible warning badge on flagged documents
- [ ] Manual test: modify a stored file directly on disk, attempt download, confirm the system catches and flags it

### 4.4 (Stretch Goal — only if time allows) RabbitMQ Upload Pipeline
- [ ] Set up RabbitMQ locally (or skip if time-constrained — this is explicitly optional per `PRD.md`)
- [ ] Push upload job to queue after initial save (status stays `Draft` until "processing" completes)
- [ ] Worker consumes queue: runs a virus-scan **stub** (mock — no real scanning needed), updates document flag
- [ ] Only attempt this after Phases 1–4.3 are fully solid — do not risk core features for this stretch goal

### Exit Checklist (must pass before Phase 5)
- [ ] Auditor can view and filter the complete audit trail
- [ ] Live activity feed updates in near real-time without page refresh
- [ ] Tamper detection demo works reliably and repeatably
- [ ] (If attempted) RabbitMQ pipeline doesn't break the core upload flow if it fails — core upload must still work even if the queue/worker has issues

---

## Phase 5 — Testing, Hardening & Demo Prep

**Goal:** The system is reliable enough to demo live in front of judges without surprises, and the pitch is rehearsed.

### 5.1 Functional Testing
- [ ] Walk through the full demo flow from `PRD.md` Section 12, step by step, exactly as it will be presented
- [ ] Test every RBAC boundary manually: each role attempting an action outside their permission (should be denied cleanly, not crash)
- [ ] Test edge cases: empty file upload, oversized file, wrong file type, expired token mid-session, double-clicking submit buttons
- [ ] Test on a second machine/browser to confirm no `localhost`-only assumptions broke portability

### 5.2 Security Review (per `RULES.md` Section 6.5)
- [ ] Confirm no secrets are hardcoded anywhere — grep the codebase for obvious leftover test credentials
- [ ] Confirm `.env` is in `.gitignore` and was never committed
- [ ] Confirm CORS is locked to the known frontend origin, not `*`
- [ ] Confirm `helmet` middleware is active
- [ ] Confirm error responses never leak stack traces in a non-dev environment

### 5.3 Docker & Deployment Check
- [ ] `docker-compose up` successfully starts the entire stack from a clean clone
- [ ] Confirm Nginx correctly routes frontend and `/api` requests
- [ ] Run the full demo flow again inside the Dockerized environment, not just local `npm run dev`

### 5.4 Demo Data
- [ ] Run `scripts/seed.js` to populate realistic demo data: multiple cases, multiple documents in different statuses, a few pre-existing audit log entries for a "populated" feel
- [ ] Prepare one deliberately "tampered" file scenario that's quick and reliable to trigger live

### 5.5 Presentation Prep
- [ ] Assign who presents which part of the demo (map to `RULES.md` module ownership / `PRD.md` Section 13)
- [ ] Rehearse the full demo flow at least twice, timed
- [ ] Prepare answers for likely judge questions:
  - "Why MongoDB over a relational DB for legal records?"
  - "How is the audit log protected from tampering itself?"
  - "How would this scale to a real ministry's document volume?" (reference `ARCHITECTURE.md` Section 11)
  - "What AI assistance was used, and how do you know the security logic is correct?" (reference `RULES.md` Section 5)
- [ ] Prepare a fallback plan: if live demo has a glitch, have a short screen-recording backup ready

### Exit Checklist (Definition of "Ready to Present")
- [ ] Full demo flow runs start-to-finish without errors, twice in a row
- [ ] Every team member can explain every part of the system they're responsible for, unaided
- [ ] Docker deployment works from a clean clone
- [ ] No hardcoded secrets, no obvious security gaps left unaddressed or unacknowledged
- [ ] Presentation roles assigned and rehearsed

---

## Cross-Phase Reminders

- **Do not skip audit logging "for now, add it later"** — it is easier to build it in from Phase 1 onward than to retrofit it across every route in Phase 5
- **RBAC checks belong in middleware, never inline in controllers** — this was set in `RULES.md` and matters most under time pressure, when the temptation to "just add a quick if-check" is highest
- **Every phase's exit checklist is a gate, not a suggestion** — moving to Phase 3 with broken auth from Phase 1 compounds problems instead of isolating them
- If running short on time, protect Phases 1–3 (core security + CRUD) fully working over attempting all of Phase 4's stretch goals — a smaller but flawless demo beats a bigger, broken one

---

*Companion to `PRD.md`, `ARCHITECTURE.md`, and `RULES.md` — Smart India Hackathon 2026, Problem Statement SIH26190, Ministry of Home Affairs*
