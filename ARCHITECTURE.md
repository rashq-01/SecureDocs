# Architecture Document
## SecureDocs — Secure Digital Document Management System

**Problem Statement:** SIH26190 — Ministry of Home Affairs
**Companion Document:** See `PRD.md` for requirements, scope, and demo flow

---

## Table of Contents

1. System Architecture (High-Level)
2. Request Flow Diagrams
3. Folder & File Structure
4. Tech Stack (Detailed)
5. Database Schema (Detailed)
6. API Route Map
7. Security Architecture
8. Real-Time Architecture (Socket.IO)
9. Environment Configuration
10. Deployment Architecture
11. Scalability Notes

---

## 1. System Architecture (High-Level)

```
                                    ┌──────────────────┐
                                    │      Client        │
                                    │  (React Frontend)  │
                                    └─────────┬──────────┘
                                              │ HTTPS
                                              ▼
                                    ┌──────────────────┐
                                    │      Nginx         │
                                    │ (Reverse Proxy /   │
                                    │  Rate Limit L1)    │
                                    └─────────┬──────────┘
                                              │
                                              ▼
                          ┌───────────────────────────────────┐
                          │         Express.js API Server       │
                          │        (Node.js — stateless)         │
                          │                                       │
                          │  ┌─────────┐ ┌─────────┐ ┌─────────┐ │
                          │  │  Auth   │ │Document │ │  Audit  │ │
                          │  │ Module  │ │ Module  │ │ Module  │ │
                          │  └─────────┘ └─────────┘ └─────────┘ │
                          │  ┌─────────┐ ┌─────────┐             │
                          │  │  RBAC   │ │ Socket  │             │
                          │  │Middleware│ │ Handler │             │
                          │  └─────────┘ └─────────┘             │
                          └──┬──────────────┬──────────────┬─────┘
                             │              │              │
                  ┌──────────▼───┐  ┌──────▼──────┐  ┌────▼─────────┐
                  │   MongoDB      │  │    Redis     │  │  File Storage │
                  │                │  │              │  │   (local /    │
                  │ • users        │  │ • rate-limit │  │    disk,      │
                  │ • documents    │  │   counters   │  │  hash-named)  │
                  │ • cases        │  │ • token      │  │               │
                  │ • auditLogs    │  │   blacklist  │  │               │
                  │  (append-only) │  │ • session    │  │               │
                  │                │  │   cache      │  │               │
                  └────────────────┘  └──────────────┘  └───────────────┘
```

**Design principle:** Every layer is replaceable/scalable independently. The API server is stateless (no in-memory session state) so it can be horizontally scaled behind Nginx exactly like NexusChat, if needed for a future phase.

---

## 2. Request Flow Diagrams

### 2.1 Authentication Flow

```
Client                Nginx            Express API         Redis           MongoDB
  │                      │                    │                │                │
  ├──POST /auth/login───►│                    │                │                │
  │                      ├───────────────────►│                │                │
  │                      │                    ├──check rate────►│                │
  │                      │                    │◄──allowed───────┤                │
  │                      │                    ├──find user─────────────────────►│
  │                      │                    │◄──user doc──────────────────────┤
  │                      │                    ├──bcrypt.compare()                │
  │                      │                    ├──sign JWT (access+refresh)       │
  │                      │                    ├──log AuditLog (LoginSuccess)────►│
  │                      │◄───200 + tokens────┤                │                │
  │◄─────────────────────┤                    │                │                │
```

### 2.2 Protected Document Access Flow (RBAC enforcement)

```
Client → Nginx → Express API
                     │
                     ├── 1. verifyJWT middleware (checks signature + expiry + Redis blacklist)
                     ├── 2. loadUser middleware (attach req.user with role + assignedCases)
                     ├── 3. rbacCheck middleware (does req.user.role allow this action on this document?)
                     │       │
                     │       ├── IO → check documentId.caseId ∈ user.assignedCases
                     │       ├── Reviewer → check documentId.department === user.department
                     │       ├── Admin → always allowed
                     │       └── Auditor → metadata only, content blocked unless flag set
                     │
                     ├── 4. controller executes (fetch document)
                     ├── 5. recompute SHA-256 hash of file, compare to stored hash
                     │       └── mismatch → flag tamperAlert=true, log CRITICAL audit event
                     ├── 6. write AuditLog entry (View/Download, actor, doc, ip, result)
                     └── 7. emit Socket.IO event → 'activity:new' to relevant dashboard rooms
```

### 2.3 Document Upload Flow

```
IO/Admin uploads file
        │
        ▼
Multer middleware (memory/disk buffer, file-type + size validation)
        │
        ▼
Generate SHA-256 hash of buffer
        │
        ▼
Store file on disk with hash-based filename (prevents path traversal / collision)
        │
        ▼
Create Document record in MongoDB (status: Draft, fileHash, filePath, metadata)
        │
        ▼
Write AuditLog entry (action: Upload)
        │
        ▼
Emit Socket.IO 'activity:new' → Admin + Department dashboards update live
        │
        ▼
(Stretch goal) Push job to RabbitMQ queue → async virus-scan stub → update document flag
```

---

## 3. Folder & File Structure

```
securedocs/
│
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   ├── db.js                  # MongoDB connection setup
│   │   │   ├── redis.js               # Redis client setup
│   │   │   └── env.js                 # centralized env var loader/validator
│   │   │
│   │   ├── models/
│   │   │   ├── User.model.js
│   │   │   ├── Document.model.js
│   │   │   ├── Case.model.js
│   │   │   └── AuditLog.model.js
│   │   │
│   │   ├── controllers/
│   │   │   ├── auth.controller.js         # login, refresh, logout
│   │   │   ├── document.controller.js     # upload, view, download, search
│   │   │   ├── case.controller.js         # create/assign cases
│   │   │   ├── audit.controller.js        # audit log queries (Auditor role)
│   │   │   └── admin.controller.js        # user/role management, dashboard stats
│   │   │
│   │   ├── routes/
│   │   │   ├── auth.routes.js
│   │   │   ├── document.routes.js
│   │   │   ├── case.routes.js
│   │   │   ├── audit.routes.js
│   │   │   ├── admin.routes.js
│   │   │   └── index.js                   # mounts all routes on /api/v1
│   │   │
│   │   ├── middlewares/
│   │   │   ├── verifyJWT.middleware.js    # validates token, checks Redis blacklist
│   │   │   ├── rbac.middleware.js         # role + case-level permission checks
│   │   │   ├── rateLimiter.middleware.js  # Redis-backed rate limiting
│   │   │   ├── errorHandler.middleware.js # centralized error responses
│   │   │   └── upload.middleware.js       # Multer config, file validation
│   │   │
│   │   ├── services/
│   │   │   ├── auth.service.js            # token generation, bcrypt logic
│   │   │   ├── hash.service.js            # SHA-256 file hashing + verification
│   │   │   ├── audit.service.js           # reusable "writeAuditLog()" helper
│   │   │   └── document.service.js        # lifecycle transition logic
│   │   │
│   │   ├── sockets/
│   │   │   ├── index.js                   # Socket.IO server init
│   │   │   └── activity.socket.js         # room-based live activity feed
│   │   │
│   │   ├── utils/
│   │   │   ├── permissionMatrix.js        # role × action permission table (single source of truth)
│   │   │   ├── apiResponse.js             # standardized success/error response shape
│   │   │   └── logger.js                  # structured console/file logging
│   │   │
│   │   ├── app.js                         # Express app setup (middlewares, routes mount)
│   │   └── server.js                      # HTTP server + Socket.IO bootstrap, DB connect
│   │
│   ├── uploads/                           # local file storage (gitignored, hash-named files)
│   ├── scripts/
│   │   └── seed.js                        # demo data seeder (users, cases, sample docs)
│   ├── .env.example
│   ├── package.json
│   └── Dockerfile
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── common/
│   │   │   │   ├── ProtectedRoute.jsx
│   │   │   │   ├── RoleGate.jsx           # conditionally renders UI based on role
│   │   │   │   └── Navbar.jsx
│   │   │   ├── dashboard/
│   │   │   │   ├── AdminDashboard.jsx
│   │   │   │   ├── IODashboard.jsx
│   │   │   │   ├── ReviewerDashboard.jsx
│   │   │   │   ├── AuditorDashboard.jsx
│   │   │   │   └── ActivityFeed.jsx       # live Socket.IO feed component
│   │   │   ├── documents/
│   │   │   │   ├── DocumentUpload.jsx
│   │   │   │   ├── DocumentList.jsx
│   │   │   │   ├── DocumentDetail.jsx
│   │   │   │   └── TamperAlertBadge.jsx
│   │   │   └── audit/
│   │   │       └── AuditLogTable.jsx
│   │   │
│   │   ├── pages/
│   │   │   ├── Login.jsx
│   │   │   ├── Dashboard.jsx              # routes to role-specific dashboard
│   │   │   ├── Documents.jsx
│   │   │   └── AuditLogs.jsx
│   │   │
│   │   ├── context/
│   │   │   ├── AuthContext.jsx
│   │   │   └── SocketContext.jsx
│   │   │
│   │   ├── services/
│   │   │   ├── api.js                     # axios instance + interceptors (attach JWT)
│   │   │   ├── auth.api.js
│   │   │   ├── document.api.js
│   │   │   └── audit.api.js
│   │   │
│   │   ├── App.jsx
│   │   └── main.jsx
│   │
│   ├── .env.example
│   ├── package.json
│   └── vite.config.js
│
├── nginx/
│   └── nginx.conf                         # reverse proxy config for demo
│
├── docker-compose.yml                     # spins up backend + mongo + redis + nginx together
├── PRD.md
├── ARCHITECTURE.md
└── README.md
```

**Why this structure:**
- Controllers stay thin — actual logic lives in `services/`, making it testable and reusable (e.g., `hash.service.js` used both on upload and on every retrieval)
- `permissionMatrix.js` is a single source of truth for RBAC — no scattered `if (role === 'admin')` checks across the codebase
- `audit.service.js` centralizes audit writing so no code path can "forget" to log an action
- Frontend `RoleGate.jsx` component ensures UI never shows actions a role can't perform, backed by the same permission logic conceptually mirrored on backend

---

## 4. Tech Stack (Detailed)

| Layer | Technology | Version (suggested) | Purpose |
|---|---|---|---|
| Runtime | Node.js | 20.x LTS | Backend runtime |
| Web Framework | Express.js | 4.x | REST API |
| Database | MongoDB | 7.x (Atlas or local) | Primary data store |
| ODM | Mongoose | 8.x | Schema modeling, validation |
| Cache / Rate Limiting | Redis | 7.x | Rate limiting, token blacklist |
| Real-Time | Socket.IO | 4.x | Live activity feed |
| Auth | jsonwebtoken | 9.x | JWT signing/verification |
| Password Hashing | bcrypt | 5.x | Password storage |
| File Upload | Multer | 1.x | Multipart form handling |
| Hashing | Node crypto (built-in) | — | SHA-256 file integrity |
| Reverse Proxy | Nginx | 1.25.x | Entry point, demo-ready LB config |
| Frontend Framework | React | 18.x | UI |
| Frontend Build Tool | Vite | 5.x | Fast dev/build |
| HTTP Client | Axios | 1.x | API calls |
| Styling | Tailwind CSS | 3.x | Fast, clean UI styling |
| Containerization | Docker + Docker Compose | — | Local orchestration, demo reliability |
| (Stretch) Message Queue | RabbitMQ | 3.x | Async upload processing pipeline |

**Not used / explicitly excluded for MVP:** AI/ML libraries, blockchain frameworks, PostgreSQL (MongoDB sufficient for document-oriented data), Kubernetes (overkill for hackathon scope).

---

## 5. Database Schema (Detailed)

### 5.1 `users` Collection

```javascript
{
  _id: ObjectId,
  name: String,
  email: String,                 // unique, indexed
  passwordHash: String,
  role: String,                  // enum: 'Admin' | 'IO' | 'Reviewer' | 'LegalLiaison' | 'Auditor'
  department: String,
  assignedCases: [ObjectId],     // ref: Case, only relevant for IO role
  isActive: Boolean,             // Admin can deactivate without deleting
  lastLogin: Date,
  createdAt: Date,
  updatedAt: Date
}
```
**Indexes:** `email` (unique), `role`

### 5.2 `cases` Collection

```javascript
{
  _id: ObjectId,
  caseId: String,                // human-readable, e.g., "FIR-2026-00123"
  title: String,
  department: String,
  assignedOfficers: [ObjectId],  // ref: User
  status: String,                // 'Open' | 'Closed' | 'Archived'
  createdAt: Date
}
```
**Indexes:** `caseId` (unique)

### 5.3 `documents` Collection

```javascript
{
  _id: ObjectId,
  caseId: ObjectId,              // ref: Case
  title: String,
  documentType: String,          // e.g., 'FIR', 'Forensic Report', 'Court Order'
  classificationLevel: String,   // 'General' | 'Confidential' | 'Restricted'
  fileHash: String,              // SHA-256 hex digest
  filePath: String,              // server-side storage path (hash-named file)
  originalFileName: String,
  fileSize: Number,
  uploadedBy: ObjectId,          // ref: User
  status: String,                // 'Draft' | 'UnderReview' | 'Approved' | 'Rejected' | 'Archived'
  tamperFlag: Boolean,           // set true if hash mismatch ever detected
  version: Number,
  createdAt: Date,
  updatedAt: Date
}
```
**Indexes:** `caseId`, `status`, compound index on `(caseId, status)`

### 5.4 `auditlogs` Collection (append-only — no update/delete operations permitted at application layer)

```javascript
{
  _id: ObjectId,
  actorId: ObjectId,             // ref: User
  action: String,                // 'Upload' | 'View' | 'Download' | 'StatusChange' |
                                  // 'Login' | 'LoginFailed' | 'PermissionChange' | 'TamperDetected'
  targetDocumentId: ObjectId,    // nullable (e.g., for Login actions)
  ipAddress: String,
  result: String,                // 'Success' | 'Failure'
  metadata: Object,              // flexible field, e.g., { fromStatus, toStatus }
  timestamp: Date                // indexed, immutable
}
```
**Indexes:** `actorId`, `targetDocumentId`, `timestamp` (descending, for recent-first queries)

**Enforcement of append-only:** No `update` or `delete` route/controller exists for this collection. At the DB layer, a MongoDB role/user restricted to `insert` + `find` only can be configured for defense-in-depth (documented as a production hardening step even if not fully configured in the hackathon demo).

---

## 6. API Route Map

Base path: `/api/v1`

### Auth
| Method | Route | Access | Description |
|---|---|---|---|
| POST | `/auth/login` | Public | Login, returns access + refresh token |
| POST | `/auth/refresh` | Public (valid refresh token) | Issue new access token |
| POST | `/auth/logout` | Authenticated | Blacklist current token in Redis |

### Documents
| Method | Route | Access | Description |
|---|---|---|---|
| POST | `/documents` | IO, Admin | Upload new document |
| GET | `/documents` | All (scoped by RBAC) | List/search documents |
| GET | `/documents/:id` | RBAC-checked | Get document metadata |
| GET | `/documents/:id/download` | RBAC-checked | Download file (hash re-verified, logged) |
| PATCH | `/documents/:id/status` | Reviewer, Admin | Change lifecycle status |

### Cases
| Method | Route | Access | Description |
|---|---|---|---|
| POST | `/cases` | Admin | Create new case |
| GET | `/cases` | Admin, Reviewer | List cases |
| PATCH | `/cases/:id/assign` | Admin | Assign officers to case |

### Audit
| Method | Route | Access | Description |
|---|---|---|---|
| GET | `/audit-logs` | Auditor, Admin | Query audit logs (filterable) |

### Admin
| Method | Route | Access | Description |
|---|---|---|---|
| GET | `/admin/dashboard-stats` | Admin | System-wide live stats |
| GET | `/admin/users` | Admin | List/manage users |
| PATCH | `/admin/users/:id/role` | Admin | Change user role |

---

## 7. Security Architecture

| Concern | Mechanism |
|---|---|
| Password storage | bcrypt, cost factor 12 |
| Session/token security | Short-lived JWT access token (~15 min) + refresh token (~7 days), refresh rotation on use |
| Instant revocation | Access tokens checked against a Redis blacklist set on logout/forced revoke |
| Brute-force protection | Redis-backed rate limiter — max 5 failed logins per account per 15 min, and per-IP limit |
| RBAC enforcement | Centralized `permissionMatrix.js` + `rbac.middleware.js` — no inline role checks scattered in controllers |
| Tamper detection | SHA-256 hash computed on upload, recomputed and compared on every retrieval |
| Audit immutability | Append-only collection; no update/delete code paths exposed via API |
| Transport security | HTTPS enforced in production (Nginx-terminated TLS) |
| Input validation | All request bodies validated (e.g., via `express-validator` or Joi) before reaching controllers |
| File upload safety | File type whitelist, size limits, hash-based filenames (prevents path traversal / overwrite attacks) |

---

## 8. Real-Time Architecture (Socket.IO)

Reuses the presence/event pattern already proven in NexusChat.

**Rooms:**
- `admin-room` — receives every audit event system-wide
- `dept:<departmentName>` — receives events scoped to that department (Reviewers)
- `case:<caseId>` — receives events scoped to a specific case (assigned IOs)

**Events:**
| Event | Emitted When | Payload |
|---|---|---|
| `activity:new` | Any audit-logged action occurs | `{ action, actor, documentId, timestamp }` |
| `document:statusChanged` | Document lifecycle transition | `{ documentId, fromStatus, toStatus }` |
| `tamper:alert` | Hash mismatch detected | `{ documentId, detectedBy, timestamp }` |

Client subscribes to relevant room(s) based on role at socket connection time (server validates JWT on socket handshake before allowing room join — same auth guarantee as REST routes).

---

## 9. Environment Configuration

`.env.example` (backend):
```
PORT=5000
NODE_ENV=development

MONGO_URI=mongodb://localhost:27017/securedocs
REDIS_URL=redis://localhost:6379

JWT_ACCESS_SECRET=change_me
JWT_REFRESH_SECRET=change_me
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

RATE_LIMIT_WINDOW_MIN=15
RATE_LIMIT_MAX_ATTEMPTS=5

UPLOAD_DIR=./uploads
MAX_FILE_SIZE_MB=25

FRONTEND_ORIGIN=http://localhost:5173
```

---

## 10. Deployment Architecture (Demo Setup)

```
docker-compose.yml spins up:
  ├── nginx        (port 80  → routes to frontend + /api → backend)
  ├── backend       (port 5000, connects to mongo + redis)
  ├── mongo         (port 27017)
  └── redis         (port 6379)
```

This mirrors production topology at small scale — the same Nginx + stateless API + MongoDB + Redis pattern used in NexusChat, so it can be demoed confidently as "designed to scale," not just "works on my laptop."

---

## 11. Scalability Notes (For Pitch — Not Required to Fully Implement)

- **API layer is stateless** — can run multiple Express instances behind Nginx load balancing (same pattern as NexusChat's 5-instance architecture) if document volume grows
- **Redis** already centralizes rate-limit counters and token blacklist, so scaling to multiple API instances requires no additional session-affinity configuration
- **MongoDB** can be sharded by `caseId` in a future phase for very large document volumes
- **File storage** is structured so migrating from local disk to S3/object storage is a config change in `document.service.js`, not an architectural rewrite
- **RabbitMQ (stretch goal)** would decouple the upload pipeline (hash → virus-scan stub → store) from the request/response cycle, improving perceived upload speed under load

---

*Companion to `PRD.md` — Smart India Hackathon 2026, Problem Statement SIH26190, Ministry of Home Affairs*
