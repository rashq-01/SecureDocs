# RULES.md
## SecureDocs — Team & AI Development Rules

**Companion Documents:** `PRD.md` (requirements) · `ARCHITECTURE.md` (system design)

**Purpose of this document:** Every team member — human or AI — writing code for this project must follow these rules. This keeps the codebase consistent, secure, and mergeable across multiple people working in parallel under hackathon time pressure. If any instruction elsewhere conflicts with this document, **this document wins.**

---

## 1. What to Use

### 1.1 Approved Tech Stack (do not deviate without team discussion)
- **Backend:** Node.js + Express.js only
- **Database:** MongoDB + Mongoose only
- **Cache/Rate-limiting:** Redis only
- **Real-time:** Socket.IO only
- **Auth:** JWT (jsonwebtoken) + bcrypt only
- **File upload:** Multer
- **Frontend:** React + Vite + Tailwind CSS
- **HTTP client (frontend):** Axios
- **Containerization:** Docker + Docker Compose

### 1.2 Approved Patterns
- **Controller → Service → Model** layering — controllers stay thin, business logic lives in `services/`
- **Centralized permission matrix** (`utils/permissionMatrix.js`) — the single source of truth for RBAC, referenced by middleware
- **Centralized audit logging** — always call `audit.service.js`'s helper function, never write directly to the AuditLog collection from a controller
- **Standardized API response shape** — every response (success or error) goes through `utils/apiResponse.js`
- **Environment variables** for all secrets/config — never hardcoded values
- **Async/await** for all asynchronous code — no callback-style code, no unhandled `.then()` chains

### 1.3 Approved Response Shape (use for every endpoint)
```javascript
// Success
{ success: true, data: {...}, message: "Document uploaded successfully" }

// Error
{ success: false, error: { code: "RBAC_DENIED", message: "You do not have access to this case" } }
```

---

## 2. What to Avoid

### 2.1 Hard Bans — Do Not Do These, Ever
- ❌ Do **not** hardcode secrets, API keys, JWT secrets, or DB URIs anywhere in code — `.env` only
- ❌ Do **not** store passwords in plaintext or with weak hashing (MD5/SHA1) — bcrypt only
- ❌ Do **not** write raw MongoDB queries with unsanitized user input (injection risk) — always use Mongoose query builders
- ❌ Do **not** expose internal file paths or stack traces in API error responses sent to the client
- ❌ Do **not** allow any route to skip the `verifyJWT` + `rbac` middleware chain except `/auth/login` and `/auth/refresh`
- ❌ Do **not** write `update` or `delete` operations against the `AuditLog` collection anywhere in the codebase — it is append-only by design
- ❌ Do **not** trust `req.body.role` or any client-submitted role/permission field — role always comes from the verified JWT payload, resolved server-side
- ❌ Do **not** use `eval()`, `child_process.exec()` with unsanitized input, or any dynamic code execution
- ❌ Do **not** commit `.env`, `/uploads`, `node_modules`, or any file containing real credentials to Git

### 2.2 Avoid Unless Team Agrees
- Avoid adding new npm packages without checking if an already-approved library covers the need
- Avoid introducing new architectural patterns mid-hackathon (e.g., switching to GraphQL, adding a new database) — stability over novelty under time pressure
- Avoid premature optimization — get RBAC + audit logging + upload flow correct first; performance tuning is secondary for a hackathon demo

### 2.3 Explicitly Out of Scope (do not build these — see PRD.md Section 5.2)
- AI/ML-based document classification or OCR
- Blockchain notarization
- Real Aadhaar/DigiLocker integration
- Mobile app
- Full PKI digital signatures

---

## 3. Libraries & Dependencies

### 3.1 Approved Backend Dependencies
| Package | Purpose |
|---|---|
| `express` | Web framework |
| `mongoose` | MongoDB ODM |
| `redis` (or `ioredis`) | Redis client |
| `socket.io` | Real-time events |
| `jsonwebtoken` | JWT signing/verification |
| `bcrypt` | Password hashing |
| `multer` | File upload handling |
| `dotenv` | Environment variable loading |
| `cors` | CORS handling |
| `helmet` | Security headers |
| `express-rate-limit` + `rate-limit-redis` | Rate limiting (Redis-backed) |
| `express-validator` or `joi` | Input validation |
| `morgan` | HTTP request logging (dev only) |
| `nodemon` (dev dependency) | Auto-reload during development |

### 3.2 Approved Frontend Dependencies
| Package | Purpose |
|---|---|
| `react`, `react-dom` | UI framework |
| `react-router-dom` | Routing |
| `axios` | HTTP client |
| `socket.io-client` | Real-time client |
| `tailwindcss` | Styling |
| `react-hot-toast` (or similar) | Notifications/toasts |

### 3.3 Rule for Adding a New Dependency
Before adding any package not listed above:
1. Check if an already-approved package can do the job
2. If genuinely needed, post in the team group with: package name, why it's needed, weekly download count / maintenance status (avoid abandoned packages)
3. Get at least one teammate's confirmation before `npm install`

This prevents dependency bloat and avoids pulling in an unmaintained or insecure package under time pressure.

---

## 4. Error Handling

### 4.1 Backend Rules
- Every controller function must be wrapped in try/catch **or** use a shared `asyncHandler` wrapper that forwards errors to Express's error-handling middleware
- All errors flow through the single `errorHandler.middleware.js` — no controller sends raw `res.status(500).send(err)` directly
- Never leak internal error details (stack traces, DB error messages) to the client in production — log them server-side, return a generic safe message to the client
- Every authentication/authorization failure must return the correct HTTP status:
  - `401 Unauthorized` — missing/invalid/expired token
  - `403 Forbidden` — valid token, but RBAC denies the action
  - `404 Not Found` — resource doesn't exist (or, for sensitive resources, consider returning 403 instead of 404 to avoid leaking existence)
  - `429 Too Many Requests` — rate limit exceeded
- Any failed action that is security-relevant (failed login, denied access attempt, tamper detection) **must** still write an AuditLog entry with `result: "Failure"` — errors are not an excuse to skip logging

### 4.2 Frontend Rules
- Every API call must handle both success and error cases — no unhandled promise rejections
- Show user-friendly error messages (from `error.message` in the standardized response shape) — never show raw error objects or stack traces to the user
- Network/connection failures should show a clear "connection lost" state, not a blank screen

### 4.3 Standard Error Codes (extend this table as needed — keep it centralized)
| Code | Meaning |
|---|---|
| `AUTH_INVALID_CREDENTIALS` | Login failed — wrong email/password |
| `AUTH_TOKEN_EXPIRED` | JWT expired, client should refresh |
| `AUTH_TOKEN_INVALID` | JWT malformed/tampered/blacklisted |
| `RBAC_DENIED` | User authenticated but not authorized for this action |
| `RATE_LIMIT_EXCEEDED` | Too many requests/attempts |
| `DOCUMENT_NOT_FOUND` | Document ID doesn't exist or not accessible |
| `TAMPER_DETECTED` | File hash mismatch on retrieval |
| `VALIDATION_ERROR` | Request body failed validation |
| `SERVER_ERROR` | Unhandled/unexpected error (generic, safe message) |

---

## 5. Boundaries of AI Usage

This project will involve AI-assisted coding (Claude, ChatGPT, Copilot, etc.). The following rules apply to **any AI-generated code** contributed to this repository.

### 5.1 What AI Can Be Used For
- Generating boilerplate (route scaffolding, Mongoose schema drafts, standard middleware patterns)
- Writing utility functions (hashing, response formatters, validators)
- Debugging error messages and stack traces
- Writing documentation, comments, and README content
- Generating test data / seed scripts
- Explaining unfamiliar error messages or library behavior
- Reviewing code for potential bugs or security issues (as a second pair of eyes, not the final authority)

### 5.2 What AI Must NOT Be Used For Without Human Review
- **Security-critical logic** — auth middleware, RBAC permission checks, hash verification, rate-limiting logic — AI can draft these, but a team member must manually read, understand, and verify the logic line-by-line before merging. This code is the entire value proposition of the project; it cannot be blindly trusted.
- **Audit logging logic** — must be manually verified that every sensitive action actually triggers a log write, since this is a core judged feature
- **Anything touching `AuditLog` collection writes** — verify manually that no update/delete path was accidentally introduced

### 5.3 Hard Rule
> **No team member merges AI-generated code they do not personally understand.**
> If you can't explain what a function does and why, in your own words, in the demo — do not merge it. Judges may ask any team member to explain any part of the system.

### 5.4 Attribution & Honesty
- It is completely fine to say "I used AI to help scaffold this" during judging — this is standard practice
- It is **not** fine to be unable to explain how a piece of your own submitted code works
- Do not present AI-generated architecture decisions as if they were arrived at through the team's own security analysis, when asked directly — be honest that AI assisted, and explain the reasoning behind the choice yourself

### 5.5 AI Should Never Be Asked To
- Generate fake/inflated performance metrics for the pitch — all numbers in the PRD/demo must come from actual test runs
- Write content claiming integration with real government systems (Aadhaar, DigiLocker, etc.) that doesn't actually exist in the code — mock/stub only, clearly labeled as such

---

## 6. General Rules

### 6.1 Code Style & Formatting
- **Indentation:** 2 spaces (no tabs)
- **Quotes:** single quotes for JS strings
- **Semicolons:** always use them
- **Line length:** soft limit ~100 characters
- Use **Prettier** with a shared `.prettierrc` committed to the repo — run before every commit
- Use **ESLint** with a shared config — fix lint errors before pushing, don't disable rules inline without a comment explaining why

### 6.2 Naming Conventions
| Item | Convention | Example |
|---|---|---|
| Files (backend) | `camelCase.type.js` | `auth.controller.js`, `rbac.middleware.js` |
| Files (React components) | `PascalCase.jsx` | `DocumentUpload.jsx` |
| Variables/functions | `camelCase` | `getUserById`, `isTokenValid` |
| Classes | `PascalCase` | `class AuditService` |
| Constants | `UPPER_SNAKE_CASE` | `MAX_LOGIN_ATTEMPTS` |
| MongoDB collections | `camelCase`, plural | `auditLogs`, `documents` |
| Environment variables | `UPPER_SNAKE_CASE` | `JWT_ACCESS_SECRET` |
| Route paths | `kebab-case`, plural nouns | `/api/v1/audit-logs` |
| Branch names | `type/short-description` | `feature/rbac-middleware`, `fix/upload-hash-bug` |

### 6.3 Commit Message Guidelines
Follow **Conventional Commits** format:
```
<type>: <short description>

[optional longer description]
```
**Types:** `feat`, `fix`, `refactor`, `docs`, `test`, `chore`, `security`

**Examples:**
```
feat: add RBAC middleware for document access control
fix: correct hash comparison in document retrieval
security: add rate limiting to login endpoint
docs: update ARCHITECTURE.md with socket room structure
```

- Keep the first line under 72 characters
- Write in present tense ("add" not "added")
- One logical change per commit where possible — don't bundle unrelated changes

### 6.4 Git Workflow
- `main` branch is always demo-ready — never commit broken code directly to `main`
- Create a feature branch per module: `feature/auth-module`, `feature/document-upload`, etc.
- Pull request (even informally, within the team) before merging to `main` — at least one other teammate glances at the diff
- Never force-push to `main`
- Merge conflicts get resolved by talking to the other person, not by guessing

### 6.5 Security (General Practices)
- Every new route must explicitly state its access level in a comment above it (e.g., `// Access: Admin only`)
- Never log sensitive data (passwords, full JWT tokens, raw file contents) to console or log files — log IDs and metadata only
- All file uploads must be validated for file type and size **before** being written to disk
- Use `helmet` middleware on the Express app for baseline security headers
- CORS must be explicitly configured to only allow the known frontend origin — never `origin: '*'` in this project
- Any teammate who discovers a security gap (even after "it's already built") raises it immediately — do not ship a known RBAC bypass because "we're out of time." Fixing it or clearly flagging it as a known limitation in the demo is always better than presenting broken security as working.

### 6.6 Documentation
- Every new module/service should have a short comment block at the top explaining its purpose
- Update `ARCHITECTURE.md` if the actual implementation diverges from the documented design — the docs must stay true to the code, not the other way around
- README.md must always have up-to-date setup instructions (`npm install`, `.env` setup, `docker-compose up`) — a teammate should be able to clone and run the project in under 5 minutes

### 6.7 Communication During the Hackathon
- If you're blocked for more than 20–30 minutes, ask the team — don't silently struggle
- Before starting work on a shared file (e.g., `permissionMatrix.js`), post in the team chat to avoid overlapping edits
- Test your module against the actual demo flow (PRD.md Section 12) before declaring it "done" — it should work in the sequence judges will see, not just in isolation

---

## 7. Definition of Done (Per Module)

A module/feature is only "done" when:
- [ ] Code follows the folder structure in `ARCHITECTURE.md`
- [ ] All sensitive actions write an AuditLog entry
- [ ] RBAC is enforced via `rbac.middleware.js`, not inline checks
- [ ] Errors are handled per Section 4 of this document
- [ ] No secrets are hardcoded
- [ ] Code has been read and understood by the person merging it (Section 5.3)
- [ ] It works end-to-end in the actual demo flow, not just in isolation
- [ ] Commit messages follow Section 6.3

---

*Companion to `PRD.md` and `ARCHITECTURE.md` — Smart India Hackathon 2026, Problem Statement SIH26190, Ministry of Home Affairs*
