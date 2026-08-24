# Product Requirements Document (PRD)
## SecureDocs — Secure Digital Document Management System for Legal & Investigation Documents

**Hackathon:** Smart India Hackathon 2026
**Problem Statement ID:** SIH26190
**Organization:** Ministry of Home Affairs (MHA), Government of India
**Category:** Software
**Theme:** Miscellaneous / Governance & Security

---

## 1. Problem Statement (Official)

> "Secure Digital Document Management System for Legal and Investigation Documents"

The Ministry of Home Affairs handles a massive volume of sensitive legal and investigation documents across departments — FIRs, case files, forensic reports, court orders, evidence logs, and inter-departmental correspondence. Currently, these documents are managed through fragmented, insecure, and largely manual/paper-based or unsecured digital systems, leading to:

- Risk of unauthorized access, tampering, or leakage of sensitive legal/investigative data
- No unified audit trail of who accessed or modified a document, and when
- Difficulty in enforcing role-based access across officers, departments, and jurisdictions
- No secure way to track document lifecycle (upload → review → approval → archival)
- Lack of real-time visibility into document status across teams

**Goal:** Build a secure, centralized, role-based digital platform for managing the lifecycle of legal and investigation documents, with strong authentication, access control, audit logging, and real-time status tracking.

---

## 2. Vision Statement

SecureDocs is a production-grade, security-first document management platform purpose-built for law enforcement and legal workflows. It brings bank-grade authentication, granular role-based access control, and a complete tamper-evident audit trail to a domain where a single unauthorized access or lost audit record can compromise an active investigation or a court case.

The system is designed the way real infrastructure is designed — not as a CRUD demo, but as a system that can be reasoned about: who can see what, who touched what, and when.

---

## 3. Target Users / Personas

| Role | Description | Primary Needs |
|---|---|---|
| **Admin (Super Admin)** | System-level administrator (e.g., IT/records officer) | Full system control, manage roles/departments, view all audit logs |
| **Investigating Officer (IO)** | Officer handling a specific case | Upload evidence/case documents, restricted to own cases |
| **Department Head / Reviewer** | Senior officer who reviews and approves documents | Approve/reject documents, view department-wide documents |
| **Legal/Court Liaison** | Handles court-bound documents | Access approved documents, generate secure export for court submission |
| **Auditor** | Independent oversight role | Read-only access to audit logs and access history — cannot view document content unless explicitly authorized |

---

## 4. Core Objectives (Aligned to Problem Statement)

1. **Centralized secure storage** for all legal/investigation documents
2. **Strict Role-Based Access Control (RBAC)** — no user sees more than their role/case permits
3. **Complete audit trail** — every view, download, upload, edit, approval is logged immutably
4. **Document lifecycle tracking** — Draft → Under Review → Approved → Archived → (optional) Sealed/Restricted
5. **Tamper-evidence** — cryptographic hash verification to detect if a document has been altered post-upload
6. **Real-time visibility** — dashboard showing document status, pending approvals, recent activity
7. **Secure authentication** — multi-layer protection against unauthorized access, brute-force, and session hijacking

---

## 5. Scope

### 5.1 In Scope (Hackathon MVP — buildable in 36–48 hours)

- User authentication (JWT-based) with role assignment
- Role-Based Access Control (Admin, IO, Reviewer, Legal Liaison, Auditor)
- Document upload with metadata (case ID, document type, classification level, tags)
- Document lifecycle status management (Draft → Under Review → Approved → Archived)
- Access control at document level (case-based restriction — an IO only sees documents tied to their assigned cases)
- Immutable audit log (every access, download, status change recorded with timestamp + user + IP)
- Document integrity verification (SHA-256 hash generated on upload, verified on every retrieval)
- Rate limiting on sensitive endpoints (login, document access) — Redis-backed
- Admin dashboard — live stats (total documents, pending reviews, active cases, recent access log)
- Secure download with access-logging (no direct file exposure — served via authenticated, logged endpoint)
- Search & filter documents by case ID, status, department, date range

### 5.2 Out of Scope (for hackathon MVP — mention as "future roadmap" in pitch)

- OCR / AI-based document classification
- Blockchain-based document notarization
- Multi-factor authentication via SMS/hardware token (mention JWT + planned 2FA as future work)
- Full digital signature (PKI) integration
- Mobile application
- Integration with real government ID/document verification APIs (Aadhaar, DigiLocker) — mock/stub only

---

## 6. Functional Requirements

### FR1 — Authentication & Authorization
- FR1.1: Users log in via email/username + password (bcrypt-hashed)
- FR1.2: On successful login, system issues a JWT access token (short-lived) + refresh token
- FR1.3: Every protected route validates JWT and checks role permissions before processing
- FR1.4: Failed login attempts are rate-limited (Redis-backed) — e.g., max 5 attempts per 15 minutes per IP/account
- FR1.5: Sessions can be forcibly revoked by Admin (e.g., compromised account)

### FR2 — Role-Based Access Control (RBAC)
- FR2.1: Each user has exactly one role: Admin, IO, Reviewer, Legal Liaison, Auditor
- FR2.2: Each document is tagged with a Case ID and a Classification Level (e.g., General / Confidential / Restricted)
- FR2.3: An IO can only access documents belonging to cases explicitly assigned to them
- FR2.4: A Reviewer can access all documents within their department pending review
- FR2.5: An Auditor can view metadata and audit logs but not document content, unless granted explicit temporary access by Admin
- FR2.6: Admin has full access and can reassign roles/permissions

### FR3 — Document Management
- FR3.1: Users with upload permission (IO, Admin) can upload documents (PDF, DOCX, images) with metadata: Case ID, Document Type, Classification, Description
- FR3.2: On upload, system generates a SHA-256 hash of the file and stores it alongside metadata
- FR3.3: Documents move through a defined lifecycle: `Draft → Under Review → Approved → Archived` (with `Rejected` as a possible branch from Under Review)
- FR3.4: Every status change requires the actor's role to have permission for that transition (e.g., only Reviewer/Admin can move Draft → Approved)
- FR3.5: On every document retrieval, system re-computes the file hash and compares to the stored hash — flags mismatch as a tamper alert

### FR4 — Audit Logging
- FR4.1: Every document action (upload, view, download, status change, permission change) is written to an immutable audit log
- FR4.2: Audit log entry includes: actor (user ID), action type, document ID, timestamp, IP address, result (success/failure)
- FR4.3: Audit logs cannot be edited or deleted by any role, including Admin (append-only log)
- FR4.4: Auditor role has a dedicated dashboard to search/filter audit logs by user, document, date range, action type

### FR5 — Dashboard & Real-Time Status
- FR5.1: Role-specific dashboard on login (e.g., IO sees their assigned cases; Reviewer sees pending approvals)
- FR5.2: Admin dashboard shows system-wide live stats: total documents, documents by status, active users, recent activity feed
- FR5.3: Recent activity feed updates in near real-time (Socket.IO push on new audit events)

### FR6 — Search & Retrieval
- FR6.1: Users can search/filter documents by Case ID, Document Type, Status, Date Range — scoped to their access level
- FR6.2: All search actions are also logged (who searched for what, when)

---

## 7. Non-Functional Requirements

| Category | Requirement |
|---|---|
| **Security** | JWT with short expiry + refresh token rotation; bcrypt password hashing (cost factor 12); HTTPS-only in production; Redis-backed rate limiting on auth & sensitive routes; input validation & sanitization on all endpoints to prevent injection attacks |
| **Performance** | Document metadata queries should return in under 200ms for up to 10,000 documents; dashboard stats update in near real-time (sub-second via Socket.IO) |
| **Scalability** | Backend designed to be horizontally scalable (stateless Node.js instances behind a load balancer — architecture pattern reused from NexusChat) |
| **Reliability** | Audit log writes must never be lost — use a durable write path (MongoDB with write concern, or append-only log file as backup) |
| **Auditability** | 100% of sensitive actions must be logged — target zero unlogged access events |
| **Data Integrity** | Every document must have a verifiable hash; any mismatch must trigger a visible tamper-alert flag |
| **Usability** | Role-specific views — users should never see UI elements/actions they don't have permission for |

---

## 8. Proposed Tech Stack

Chosen to match team's existing expertise and allow rapid, reliable implementation within hackathon time constraints.

| Layer | Technology | Reasoning |
|---|---|---|
| **Backend Runtime** | Node.js + Express.js | Team's core strength; fast to build REST APIs |
| **Database** | MongoDB (Mongoose) | Flexible schema for documents/metadata; team has direct experience (LibraTech, NexusChat) |
| **Caching / Rate Limiting** | Redis | Rate limiting on login & sensitive endpoints; session/token blacklist for revocation |
| **Real-Time Updates** | Socket.IO | Live dashboard updates (recent activity feed, pending review counts) |
| **Authentication** | JWT (access + refresh tokens) + bcrypt | Proven pattern from NexusChat; stateless, scalable |
| **File Storage** | Local disk (hackathon) / structured for future S3 migration | Files stored with hashed filenames; metadata in MongoDB |
| **Reverse Proxy** | Nginx | Serves as entry point; can demonstrate load-balancing readiness |
| **Frontend** | React.js (or plain HTML/CSS/JS if time-constrained) | Dashboard views, role-based UI rendering |
| **Deployment (Demo)** | Render / local Docker Compose | Fast, reliable demo environment |
| **Optional Enhancement** | RabbitMQ | Async processing queue for document upload pipeline (virus-scan stub → hash → store) — stretch goal to showcase message-queue skills |

---

## 9. System Architecture (High-Level)

```
                         ┌─────────────┐
                         │   Nginx     │  (reverse proxy / entry point)
                         └──────┬──────┘
                                │
                     ┌──────────▼──────────┐
                     │   Express API        │
                     │  (Node.js backend)    │
                     └──┬────────┬────────┬─┘
                        │        │        │
            ┌───────────▼─┐  ┌───▼────┐  ┌▼─────────────┐
            │  MongoDB     │  │ Redis  │  │  Socket.IO    │
            │ (documents,  │  │ (rate  │  │ (live activity│
            │  users, logs)│  │ limit, │  │  feed push)   │
            │              │  │ tokens)│  │               │
            └──────────────┘  └────────┘  └───────────────┘
```

**Key architectural decisions:**
- Audit log writes happen synchronously with the triggering action (no eventual consistency for security logs)
- File hash verification happens on every retrieval, not just on upload
- Redis used for two purposes: rate limiting (auth/security) and revoked-token blacklist (instant session kill)

---

## 10. Data Models (Draft Schema)

### User
```
{
  _id, name, email, passwordHash, role: [Admin | IO | Reviewer | LegalLiaison | Auditor],
  department, assignedCases: [caseId], isActive, lastLogin, createdAt
}
```

### Document
```
{
  _id, caseId, title, documentType, classificationLevel: [General|Confidential|Restricted],
  fileHash (SHA-256), filePath, uploadedBy, status: [Draft|UnderReview|Approved|Rejected|Archived],
  currentVersion, createdAt, updatedAt
}
```

### AuditLog (append-only)
```
{
  _id, actorId, action: [Upload|View|Download|StatusChange|Login|LoginFailed|PermissionChange],
  targetDocumentId (nullable), ipAddress, result: [Success|Failure], timestamp
}
```

### Case
```
{
  _id, caseId, title, department, assignedOfficers: [userId], status, createdAt
}
```

---

## 11. Success Metrics (For Judging & Demo)

| Metric | Target for Demo |
|---|---|
| Role-based access enforcement | 100% — demonstrate an IO being denied access to another IO's case documents |
| Audit trail completeness | Every action in the demo flow visibly logged and viewable by Auditor role |
| Tamper detection | Live demo: manually alter a stored file, show system flags hash mismatch on retrieval |
| Auth security | Show rate-limiting kick in after repeated failed logins |
| Real-time dashboard | Live activity feed updates instantly when a document action occurs in another browser tab |
| Response time | Document list/search returns in under 200ms in demo dataset |

---

## 12. Demo Flow (Judging Presentation Plan)

1. **Login as Admin** → show system-wide dashboard with live stats
2. **Login as IO** → upload a new case document → show it enters "Draft" status
3. **Attempt access to another case's document as the same IO** → show access denied (RBAC in action)
4. **Login as Reviewer** → see pending document → approve it → status changes to "Approved"
5. **Login as Auditor** → show full audit trail of every action performed above, with timestamps and IPs
6. **Tamper demo** → manually modify the stored file on disk → attempt retrieval → system flags hash mismatch
7. **Rate limiting demo** → attempt 6 rapid failed logins → show account/IP temporarily blocked
8. **Live activity feed** → open two browser windows, perform an action in one, show instant update in the other via Socket.IO

---

## 13. Team Role Allocation (To Be Assigned)

| Area | Suggested Owner | Notes |
|---|---|---|
| Auth + RBAC + Redis rate limiting | Backend-focused member (Rajesh) | Core security layer — highest priority |
| Document upload + hash verification + lifecycle | Backend member | Core feature — second priority |
| Audit logging system | Backend member | Can be built in parallel once schema is fixed |
| Socket.IO live dashboard | Backend/full-stack member | Reuses patterns from NexusChat presence system |
| Frontend (React or plain HTML/CSS/JS) | Frontend-focused member | Role-based views, dashboard UI |
| Demo data seeding + presentation prep | Any member | Critical — do not leave for the last hour |

---

## 14. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Time constraint (36–48 hrs) | Strictly follow MVP scope in Section 5.1; defer everything in 5.2 |
| RBAC logic complexity | Define permission matrix (role × action) upfront before coding — avoid ad-hoc checks scattered in code |
| Audit log becoming a bottleneck | Keep audit writes lightweight (single insert, indexed by documentId + timestamp) |
| File storage complexity | Use local disk storage for MVP; structure code so migrating to S3 later is a config change, not a rewrite |
| Team merge conflicts | Clear module ownership (Section 13) + shared schema definition finalized before parallel work begins |

---

## 15. Why This Solution Wins (Pitch Angle)

- **Real engineering, not a wrapper around an AI API** — judges from MHA and technical panels value systems that demonstrably work end-to-end over flashy but shallow AI demos
- **Directly maps to a real, painful government problem** — fragmented, insecure document handling across sensitive investigation workflows
- **Security-first architecture** — RBAC, immutable audit logs, tamper detection, and rate limiting are not afterthoughts, they are the core value proposition
- **Reuses proven, battle-tested architecture patterns** from the team's existing production system (NexusChat) — horizontally scalable design, Redis-backed rate limiting, Socket.IO real-time layer — de-risking the build under hackathon time pressure
- **Demoable in a way that is impossible to fake** — live RBAC denial, live tamper detection, live audit trail are concrete, verifiable, and memorable for judges

---

*Document prepared for Smart India Hackathon 2026 — Problem Statement SIH26190 (Ministry of Home Affairs)*
