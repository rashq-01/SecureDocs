# AI_FEATURES.md
## SecureDocs — AI Integration Plan (RabbitMQ-Backed)

**For:** Antigravity (AI build agent)
**Context:** All 4 core features (Search, Notifications, Preview, Digital Signature) are built and tested. This document adds AI capabilities on top, using RabbitMQ for async processing so AI calls never block the main request/response cycle.

**Scope constraint — read first:** These are LLM-API-powered features (Claude/OpenAI/Gemini via API calls), NOT custom-trained ML models. Do not claim "we trained a model" anywhere in code comments, UI copy, or pitch material — the honest and correct framing is "AI-powered" via a hosted LLM API, which is standard, legitimate, and exactly what most production AI features actually are.

---

## 0. Why RabbitMQ (Architecture Decision)

LLM API calls take 2–8 seconds. Running them synchronously inside a request (e.g., during document upload) would:
- Block the user from continuing until the AI call finishes
- Fail the entire upload if the LLM API is slow/down
- Create a bottleneck under concurrent uploads

**Solution:** Every AI task is queued to RabbitMQ and processed by a separate worker process. The triggering request (upload, status change, etc.) returns immediately as it does today — AI results arrive asynchronously and update the record + notify the user via the **existing** Socket.IO/Notification system already built.

```
[Existing flow, unchanged]
Document uploaded -> saved (status: Draft) -> AuditLog written -> response sent to user
                              |
                              v
              [NEW] AI job pushed to RabbitMQ queue
                              |
                              v
              [NEW] Worker process consumes job -> calls LLM API
                              |
                              v
              Document updated with AI result (summary/tags)
                              |
                              v
              [Existing] Notification created + Socket.IO event emitted
```

---

## 1. RabbitMQ Setup

### 1.1 Add to `docker-compose.yml`
```yaml
rabbitmq:
  image: rabbitmq:3-management-alpine
  container_name: securedocs-rabbitmq
  ports:
    - "5672:5672"    # AMQP port
    - "15672:15672"  # Management UI (useful for demo — show judges the live queue)
  environment:
    RABBITMQ_DEFAULT_USER: securedocs
    RABBITMQ_DEFAULT_PASS: change_me_in_env
  networks:
    - securedocs-network
```

### 1.2 Backend Dependencies
```
npm install amqplib
```

### 1.3 New Files
- `backend/src/config/rabbitmq.js` — connection setup, channel creation, reconnect-on-failure logic
- `backend/src/queues/aiTasks.queue.js` — defines queue name(s), publish helper functions
- `backend/src/workers/aiWorker.js` — standalone worker process (run separately from the main API server via `node src/workers/aiWorker.js`, or as its own process in `docker-compose.yml`) that consumes jobs and dispatches to the right AI handler

### 1.4 Queue Design
Use **one queue with a `type` field in the message payload**, not four separate queues — simpler to manage for a hackathon scope:

```javascript
// Message shape published to the queue
{
  type: 'SUMMARIZE' | 'CLASSIFY' | 'ANOMALY_CHECK' | 'SECURITY_NARRATIVE',
  payload: { documentId, ... } | { auditLogId, ... },
  requestedAt: ISODate
}
```

Worker reads `type` and routes to the corresponding handler function. This keeps the queue infrastructure simple while still cleanly separating each AI feature's logic.

### 1.5 Environment Variables (add to `.env.example`)
```
RABBITMQ_URL=amqp://securedocs:change_me_in_env@localhost:5672
LLM_API_KEY=your_key_here
LLM_API_PROVIDER=anthropic   # or openai / google — pick one, keep it configurable
```

### 1.6 Reliability Rule
If RabbitMQ is unreachable or a job fails, **the core action (upload, status change, etc.) must already have succeeded and returned to the user before this point** — AI processing failure must NEVER fail or roll back the underlying document/audit operation. Log the failure, optionally retry (max 3 attempts with backoff), and if it still fails, leave the AI field empty/null rather than blocking anything. This matches the existing `RULES.md` principle that security-critical core flows are never risked for secondary features.

---

## 2. AI Feature #1 — Document Summarization

**What it does:** After upload, generate a 2–3 sentence plain-English summary of the document's content, shown in the document list and detail view — makes scanning/reviewing large document sets much faster for Reviewers and Auditors.

### Implementation
- On successful upload (`document.controller.js` -> `uploadDocument`), after the existing save logic, publish a `SUMMARIZE` job to the queue with `{ documentId }`
- Worker handler `handleSummarize(payload)`:
  - Fetch the document, decrypt it (reuse existing `encryption.service.js` decrypt function — same one used by download/preview)
  - Extract text (for PDFs, use a lightweight text-extraction library like `pdf-parse`; if the file isn't text-extractable, e.g. a scanned image, skip gracefully and leave summary null — do NOT attempt OCR, that's out of scope)
  - Call the LLM API with a system prompt like: *"Summarize this legal/investigation document in 2-3 plain-English sentences for a case reviewer. Be factual, do not speculate beyond the document's content."*
  - Save result to a new `aiSummary` field on the `Document` model
  - Trigger existing notification pattern: notify `document.uploadedBy` that "AI summary ready" (optional — can also be silent, just update-on-view, team's call)
- Add `aiSummary` field to `Document.model.js` (nullable string)

### Frontend
- `DocumentList.jsx`: show a truncated AI summary under the title (if present) instead of just document type — makes list scanning meaningfully faster
- `DocumentDetail.jsx`: full summary in a distinct panel, labeled clearly "AI-Generated Summary" (never let it look like it's part of the original document content — always visually and textually distinguished)

---

## 3. AI Feature #2 — LLM-Based Smart Document Classification

**What it does:** Replaces the earlier "rule-based keyword" idea with a real LLM call that suggests the correct `documentType` (FIR, Forensic Report, Court Order, Witness Statement, etc.) based on actual document content, not just filename guessing.

### Implementation
- Publish a `CLASSIFY` job alongside (or instead of, team's choice) the rule-based suggestion already scoped in `REMAINING_FEATURES.md` Priority 6 — since real AI is now in scope, this LLM version supersedes that simpler heuristic version
- Worker handler `handleClassify(payload)`:
  - Same text extraction as summarization (share the extracted text between both jobs if processed together, to save an extra extraction pass — consider combining SUMMARIZE + CLASSIFY into a single LLM call that returns both, more efficient than two separate API calls)
  - Prompt: *"Based on this document's content, classify it as one of: FIR, Forensic Report, Court Order, Witness Statement, Charge Sheet, Evidence Record, Legal Notice, Other. Respond with only the category name."*
  - Store as `aiSuggestedType` on the `Document` model — **never auto-overwrite** the uploader's chosen `documentType`, only suggest it
- Frontend: in `DocumentUpload.jsx` or `DocumentDetail.jsx`, show "AI suggests: Forensic Report" with an accept/dismiss action if it differs from what was manually selected

---

## 4. AI Feature #3 (Flagship) — Audit Log Anomaly Detection

**What it does:** A background AI process continuously monitors new Audit Log entries. When it detects unusual behavior — e.g., an IO downloading 50 documents at 3:00 AM, an Admin rapidly changing multiple user roles in a short window, or a user accessing documents far outside their normal pattern — it flags it and immediately triggers a `Security Alert` via the **existing Socket.IO system**, visible on the Admin's Security Dashboard in real time.

**Why this is the strongest AI feature to build:** `suspiciousDetection.service.js` already exists (394 lines, rule-based). This feature **upgrades that existing system** rather than building something from scratch — lower risk, and a genuinely compelling judge-facing story: "our rule-based detection already catches known patterns; the AI layer catches patterns we didn't explicitly hard-code for."

### 4.1 Architecture — Hybrid, Not AI-Only (Important Design Decision)

Do **not** replace the existing `suspiciousDetection.service.js` rule-based checks with AI — keep both, in this order:

1. **Fast rule-based pre-filter (existing, unchanged):** the current `suspiciousDetection.service.js` logic still runs synchronously/immediately as it does today (e.g., excessive downloads threshold) — this stays instant, no LLM latency, no queue needed for the obvious cases it already catches
2. **AI layer (new, async via RabbitMQ):** runs periodically (e.g., every N minutes via a scheduled job, similar pattern to the existing `jobs/cleanupTokens.js`) or is triggered on every new `AuditLog` write for a given user, and analyzes a **window of recent activity** (e.g., that user's last 20–50 audit events) holistically — looking for patterns a fixed rule threshold would miss, like unusual timing, unusual sequences of actions, or access patterns that deviate from that specific user's historical norm

This hybrid approach is both more realistic to build well in remaining time AND a better engineering answer than "AI does everything" — fast deterministic rules catch the obvious cases instantly, AI catches the subtler cases the rules weren't written for.

### 4.2 Backend Implementation

- New scheduled job `backend/src/jobs/aiAnomalyScan.js` (pattern-matched to existing `cleanupTokens.js`):
  - Runs on an interval (e.g., every 5–10 minutes — tune for demo purposes, could be shorter during live judging)
  - For each active user with recent activity, pull their last N `AuditLog` entries
  - Publish an `ANOMALY_CHECK` job to RabbitMQ with `{ userId, recentAuditLogIds }`
- Worker handler `handleAnomalyCheck(payload)`:
  - Fetch the actual audit log entries
  - Format them as a compact structured summary (action, timestamp, target, IP) for the LLM
  - Prompt: *"You are a security analyst reviewing a user's recent activity in a legal document management system. Given this list of recent actions with timestamps, identify if there is any unusual or concerning pattern (e.g., unusual time of day, unusually high volume, unusual sequence, access outside normal role behavior). Respond in JSON: `{ "isAnomalous": boolean, "severity": "low"|"medium"|"high", "reason": "plain English explanation" }`"*
  - If `isAnomalous: true`:
    - Write a new `AuditLog` entry with action `AIAnomalyDetected` (extends the existing audit action enum)
    - Create a `SecurityAlert` (new model, or extend whatever the existing `suspiciousDetection.service.js` already writes to if it already has an alerts collection — check first, reuse if present)
    - Emit a Socket.IO event `security:alert` to the `admin-room` (the room pattern already exists — reuse it)
- **New model (if not already present from the existing suspicious-detection system):** `SecurityAlert` — `{ userId, source: 'RuleBased' | 'AI', severity, reason, relatedAuditLogIds, isResolved, createdAt }`

### 4.3 Frontend Implementation

- `SecurityDashboard.jsx` (already exists): add an "AI Detected" badge/filter distinct from "Rule-Based" alerts in the existing `SuspiciousActivityList.jsx`, so judges can clearly see both detection layers working side by side
- Real-time: when `security:alert` fires via the existing Socket.IO connection, show a live toast to any connected Admin (reuse the existing notification/toast pattern) plus update the Security Dashboard's live count without a refresh (same pattern as the existing `ActivityFeed.jsx` real-time updates)
- On the alert detail (click to expand), show the plain-English `reason` the AI gave — this is the single best demo moment for this feature: showing judges a human-readable explanation of *why* something was flagged, not just a red dot

### 4.4 Demo Script Addition (for `PRD.md` Section 12)

Add this as a new demo step: *"Trigger a deliberately unusual pattern (e.g., rapidly download several documents in a short window as a test IO account), wait for the next AI scan cycle, and show the Security Dashboard receiving a live AI-generated alert with a plain-English explanation — demonstrating that the system doesn't just log what happened, it understands and explains why it's concerning."*

---

## 5. Build Order for This Phase

1. RabbitMQ setup + worker process skeleton (get the queue infrastructure working end-to-end with a trivial test job first, before wiring in real AI logic)
2. Feature #4 (Anomaly Detection) — highest judging impact, builds on existing `suspiciousDetection.service.js`, do this first among the AI features
3. Feature #1 (Summarization) — second priority, clear utility, relatively simple
4. Feature #2 (Smart Classification) — can share the text-extraction step with Feature #1, do these together if time allows
5. Full test: confirm that if RabbitMQ or the LLM API is down/slow, core upload/status-change/audit flows are completely unaffected (per Section 1.6 reliability rule) — this must be manually verified, not assumed

---

## 6. What NOT to Do

- Do not claim a custom-trained ML model anywhere — be accurate that this is LLM-API-powered
- Do not let any AI feature block or fail a core user action if the AI call fails
- Do not replace the existing rule-based `suspiciousDetection.service.js` — augment it, per Section 4.1
- Do not auto-apply AI classification over a user's manual choice — always suggest, never silently overwrite
- Do not skip the reliability/fallback testing in Section 1.6 — an AI feature that accidentally breaks document upload during the live demo is a worse outcome than not having AI at all

---

## 7. Pitch Framing (For the Team)

This positions AI correctly in the story: *"We use a hybrid detection approach — fast, deterministic rule-based checks catch known attack patterns instantly with zero latency, while an LLM-powered analysis layer runs asynchronously via RabbitMQ to catch subtler behavioral anomalies the rules weren't explicitly written for, and explains its reasoning in plain English rather than just raising a flag."* This is a defensible, technically honest answer that shows deliberate architecture thinking rather than "we bolted on ChatGPT."

---

*Companion to `PRD.md`, `ARCHITECTURE.md`, `RULES.md`, `PHASES.md`, `DESIGN_v2.md`, `MEMORY.md`, `REMAINING_FEATURES.md`, `NEXT_BUILD.md` — Smart India Hackathon 2026, Problem Statement SIH26190, Ministry of Home Affairs*
