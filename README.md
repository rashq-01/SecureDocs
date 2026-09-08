# 🛡️ SecureDocs — Secure Digital Document Management System

> **Smart India Hackathon 2026 (SIH 2026)**  
> **Problem Statement ID:** `SIH26190`  
> **Organization:** Ministry of Home Affairs (MHA), Government of India  
> **Theme:** Governance & Security / Software  

[![Node.js](https://img.shields.io/badge/Node.js-v20+-green.svg?logo=node.js)](https://nodejs.org/)
[![Express.js](https://img.shields.io/badge/Express-4.18-lightgrey.svg?logo=express)](https://expressjs.com/)
[![React](https://img.shields.io/badge/React-18-blue.svg?logo=react)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-5.x-purple.svg?logo=vite)](https://vitejs.dev/)
[![MongoDB](https://img.shields.io/badge/MongoDB-6.0%2B-green.svg?logo=mongodb)](https://www.mongodb.com/)
[![Redis](https://img.shields.io/badge/Redis-7.x-red.svg?logo=redis)](https://redis.io/)
[![RabbitMQ](https://img.shields.io/badge/RabbitMQ-3.x-orange.svg?logo=rabbitmq)](https://www.rabbitmq.com/)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED.svg?logo=docker)](https://www.docker.com/)
[![Security](https://img.shields.io/badge/Encryption-AES--256--GCM-critical.svg)](#security-architecture)

---

## 📑 Table of Contents

1. [Executive Overview](#-executive-overview)
2. [Key Features & Capabilities](#-key-features--capabilities)
3. [System Architecture](#-system-architecture)
4. [Technology Stack](#-technology-stack)
5. [Prerequisites & System Requirements](#-prerequisites--system-requirements)
6. [Quick Start: Option 1 — One-Click Docker Setup (Recommended)](#-quick-start-option-1--one-click-docker-compose-recommended)
7. [Quick Start: Option 2 — Local Native Installation (From Scratch)](#-quick-start-option-2--local-native-installation-from-scratch)
8. [Pre-Seeded Demo Accounts & Role Matrix](#-pre-seeded-demo-accounts--role-matrix)
9. [Environment Variables Reference](#-environment-variables-reference)
10. [Asynchronous AI Pipeline (RabbitMQ Worker)](#-asynchronous-ai-pipeline-rabbitmq-worker)
11. [Security & Cryptography Deep Dive](#-security--cryptography-deep-dive)
12. [Complete REST API Reference](#-complete-rest-api-reference)
13. [Real-Time WebSockets (Socket.IO)](#-real-time-websockets-socketio)
14. [Repository File Structure](#-repository-file-structure)
15. [Database Maintenance & Reset Scripts](#-database-maintenance--reset-scripts)
16. [Comprehensive Troubleshooting & FAQ](#-comprehensive-troubleshooting--faq)
17. [Production Hardening & Deployment](#-production-hardening--deployment)
18. [License & Acknowledgments](#-license--acknowledgments)

---

## 🏛️ Executive Overview

The **Ministry of Home Affairs (MHA)** oversees high-stakes legal, forensic, and law enforcement workflows involving First Information Reports (FIRs), forensic lab reports, court orders, witness depositions, and inter-departmental communications. Handling these documents through traditional paper trails or unsegmented cloud shares exposes agencies to critical vulnerabilities:
- **Tampering & Forgery:** Absence of real-time cryptographic integrity proofs.
- **Unauthorized Access & Leaks:** Lack of strict, case-isolated Role-Based Access Control (RBAC).
- **Broken Chain of Custody:** Missing immutable audit trails recording document viewing, download, or status transitions.
- **Slow Processing & Review:** Backlogs caused by manual reading and classification of voluminous evidence.

**SecureDocs** is an enterprise-grade, defense-in-depth digital document management platform engineered specifically for investigative and legal authorities. It delivers:
- **AES-256-GCM** authenticated document encryption at rest.
- **SHA-256** checksum verification on every file transaction to detect tampering immediately.
- **HMAC-SHA256 Digital Signatures** for document review and approval verification.
- **Dynamic Digital Watermarking** injecting reviewer email, timestamp, IP, and GPS coordinates onto previews and downloads.
- **Append-only immutable audit logging** with cryptographic hash verification.
- **Asynchronous AI Worker (RabbitMQ)** powering non-blocking document summarization, smart classification, OCR extraction, and real-time LLM behavioral anomaly detection.
- **Socket.IO** real-time Security Operations Center (SOC) dashboards and activity feeds.

---

## ✨ Key Features & Capabilities

### 🛡️ Security & Cryptography
- **AES-256-GCM File Encryption:** Files stored on disk are encrypted using a 256-bit symmetric key with dynamic IVs and authentication tags. Direct storage inspection yields unreadable cipher bytes.
- **SHA-256 Tamper Detection:** A cryptographic hash is calculated upon upload. Any subsequent access re-hashes the file; a mismatch triggers an immediate `TamperDetected` security alert and flags the record.
- **HMAC-SHA256 Approval Signatures:** Document approvals generate tamper-evident signatures tying the document hash, reviewer ID, and approval timestamp.
- **Dynamic Watermarking:** PDFs and images rendered via preview/download are dynamically stamped with the officer's identity, IP address, timestamp, and optional location coordinates to prevent unauthorized screenshots or leaks.
- **Redis Token Blacklisting:** Instant access token invalidation upon user logout or administrative session termination.
- **Multi-Tier Rate Limiting:** Redis-backed rate limiting on authentication, document uploads, downloads, and sensitive administrative actions to thwart brute-force and scraping attacks.

### 👥 Access Control & Workflow Governance
- **5 Granular Roles:** Super Admin, Investigating Officer (IO), Department Reviewer, Legal/Court Liaison, and Independent Auditor.
- **Case-Level Isolation:** IOs are strictly isolated to cases explicitly assigned to them.
- **Document Lifecycle State Machine:** Enforced state transitions (`Draft` ➔ `UnderReview` ➔ `Approved` / `Rejected` ➔ `Archived`).
- **Cryptographic Version Control:** Every document edit or update increments the version counter, maintaining complete version history, changelogs, and one-click rollback capabilities.
- **Delegated Access Requests:** Officers can request temporary access to restricted case files with admin approval workflows, custom justification logs, and token expiration.
- **Time-Bounded Secure Sharing:** Generate expiring, download-capped, password-protected share links for court personnel or external agencies.

### 🤖 Asynchronous AI Processing Pipeline
- **RabbitMQ Task Queue:** High-latency AI calls never block the Express HTTP request-response cycle. Document uploads return immediately while background workers process AI jobs asynchronously.
- **Automatic Document Summarization:** Generates 2-sentence plain-English executive summaries from PDFs and text files using modern LLMs (OpenRouter / Gemini).
- **OCR Text Extraction:** Scanned evidence images (PNG, JPG, WebP) are extracted using Tesseract.js OCR before being analyzed by the LLM.
- **Smart Category Classification:** Documents are automatically classified into legal categories (`FIR`, `Forensic Report`, `Court Order`, `Evidence Log`, `Witness Statement`).
- **AI-Powered Anomaly & Threat Detection:** Evaluates user audit log sequences to identify suspicious behavioral anomalies (e.g., rapid downloading, off-hours access, abnormal administrative role changes) and raises real-time security alerts.

---

## 🏗️ System Architecture

```
                                  ┌──────────────────────────────┐
                                  │   Web Client (React + Vite)  │
                                  │   Port: 5173 (Dev) / 80 (Nginx)│
                                  └──────────────┬───────────────┘
                                                 │ HTTP / WebSocket
                                                 ▼
                                  ┌──────────────────────────────┐
                                  │   Nginx Reverse Proxy        │
                                  │   Routes /api and /socket.io │
                                  └──────────────┬───────────────┘
                                                 │
                                                 ▼
                                  ┌──────────────────────────────┐
                                  │   Express.js API Server      │
                                  │   Port: 5000                 │
                                  └───────┬──────────────┬───────┘
                                          │              │
                   ┌──────────────────────┼──────────────┴──────────────────────┐
                   │                      │                                     │
                   ▼                      ▼                                     ▼
        ┌────────────────────┐ ┌────────────────────┐                 ┌────────────────────┐
        │   MongoDB 6 / 7    │ │    Redis 7.x       │                 │   RabbitMQ 3.x     │
        │   Port: 27017      │ │    Port: 6379      │                 │   Port: 5672       │
        │                    │ │                    │                 │   (UI: 15672)      │
        │ • Users & Roles    │ │ • Rate Limiting    │                 └─────────┬──────────┘
        │ • Cases & Docs     │ │ • Token Blacklist  │                           │
        │ • Version History  │ │ • Pub/Sub Realtime │                           ▼
        │ • Immutable Audits │ └────────────────────┘                 ┌────────────────────┐
        └────────────────────┘                                        │  Async AI Worker   │
                   │                                                  │  (aiWorker.js)     │
                   ▼                                                  │                    │
        ┌────────────────────┐                                        │ • OCR / PDF Parse  │
        │ Encrypted Storage  │                                        │ • LLM Summarizer   │
        │ (uploads/ dir)     │                                        │ • Smart Classifier │
        │ • AES-256-GCM Files│                                        │ • Anomaly Scanner  │
        └────────────────────┘                                        └────────────────────┘
```

---

## 💻 Technology Stack

| Domain | Technology | Version | Purpose |
|---|---|---|---|
| **Frontend Framework** | React | 18.2 | Component-driven user interface |
| **Build Tool** | Vite | 5.x / 8.x | High-speed frontend bundling and HMR |
| **Styling** | Tailwind CSS | 3.3 | Responsive modern styling system |
| **State Management** | Zustand | 4.4 | Lightweight global client state |
| **HTTP Client** | Axios | 1.6 | REST API client with JWT interceptors |
| **Backend Runtime** | Node.js | 20.x LTS | High-performance asynchronous backend |
| **Web Server** | Express.js | 4.18 | RESTful API service framework |
| **Database** | MongoDB | 6.x / 7.x | Primary persistent document store |
| **ODM** | Mongoose | 8.0 | Schema validation and relational mapping |
| **In-Memory Cache** | Redis | 7.x | Rate limiting counters, token revocation blacklist, pub/sub |
| **Message Broker** | RabbitMQ | 3-management | Asynchronous message queue for background AI workloads |
| **Real-Time Engine** | Socket.IO | 4.7 | Bidirectional WebSocket notifications and alerts |
| **Authentication** | JWT + bcrypt | 9.0 / 5.1 | Stateless access/refresh token pairs, cost factor 12 hashing |
| **Cryptography** | Node.js `crypto` | Native | AES-256-GCM encryption, SHA-256 hashing, HMAC-SHA256 |
| **PDF Processing** | pdf-lib & pdf-parse | 1.17 / 2.4 | Dynamic watermarking and text extraction |
| **OCR Processing** | Tesseract.js | 7.0 | Local OCR extraction from uploaded image evidence |
| **Containerization** | Docker & Compose | 3.8+ | Full-stack container orchestration |
| **Reverse Proxy** | Nginx | Alpine | Static distribution and API proxying |

---

## 📋 Prerequisites & System Requirements

Ensure your host machine satisfies the following minimum specifications:

### Hardware Requirements
- **CPU:** 2+ cores (4+ cores recommended for local OCR and Docker workloads)
- **RAM:** Minimum 4 GB (8 GB recommended when running all Docker containers)
- **Disk Space:** At least 5 GB free disk space for container images and uploaded test files

### Software Dependencies
- **Operating System:** Linux (Ubuntu 20.04+, Debian, Fedora), macOS, or Windows 10/11 with WSL2
- **Node.js:** `v20.0.0` or higher (verify via `node -v`)
- **npm:** `v10.0.0` or higher (verify via `npm -v`)
- **Git:** Installed and available in PATH (verify via `git --version`)
- **Docker & Docker Compose:** Docker Engine 24+ with Compose v2+ (recommended for Option 1)

---

## 🚀 Quick Start: Option 1 — One-Click Docker Compose (Recommended)

This method spins up the complete ecosystem — **MongoDB, Redis, RabbitMQ, Seeder, AI Worker, Backend API, and Nginx Frontend** — using a single command without manual service installations.

### 1. Clone the Repository
```bash
git clone https://github.com/rashq-01/SecureDocs.git
cd SecureDocs
```

### 2. Verify Backend Configuration
The root `docker-compose.yml` mounts `./backend/.env`. Ensure this file exists (it is pre-configured in this repository, or copy from example):
```bash
cp backend/.env.example backend/.env
```
*(If you want live LLM capabilities instead of simulated fallback, add your `OPENROUTER_API_KEY` or `GEMINI_API_KEY` into `backend/.env`)*.

### 3. Launch All Services
```bash
docker compose up -d --build
```

### 4. Verify Service Health
Monitor the startup until all containers are healthy:
```bash
docker compose ps
```
You will see 7 coordinated containers running:
- `securedocs-mongo`: MongoDB database
- `securedocs-redis`: Redis cache & rate limiter
- `securedocs-rabbitmq`: RabbitMQ message broker
- `securedocs-seeder`: Automatic database seed container (exits automatically with code 0 once seeded)
- `securedocs-worker`: Background AI processing engine
- `securedocs-backend`: Node/Express REST API & Socket.IO server
- `securedocs-frontend`: Nginx web server hosting the React client

### 5. Access the Application
Open your browser and navigate to:

| Application / Service | URL | Credentials / Notes |
|---|---|---|
| **SecureDocs Web Portal** | **`http://localhost`** (Port 80) | Login using any seeded demo user (e.g. `admin@mha.gov.in` / `password123`) |
| **Backend REST API** | `http://localhost:5000/api/v1` | Health check: `http://localhost:5000/health` |
| **RabbitMQ Management Dashboard** | `http://localhost:15672` | Username: `securedocs` \| Password: `securedocs_pass` |
| **MongoDB Direct Port** | `localhost:27017` | Standard connection string: `mongodb://localhost:27017/securedocs` |
| **Redis Direct Port** | `localhost:6379` | Standard connection string: `redis://localhost:6379` |

### 6. View Live Logs
To monitor individual service activity:
```bash
# View backend API requests
docker compose logs -f backend

# View AI Worker processing OCR & Summaries
docker compose logs -f worker

# View Frontend / Nginx logs
docker compose logs -f frontend
```

### 7. Stop the Stack
```bash
# Gracefully stop containers
docker compose down

# Stop containers and delete database volumes (clean slate)
docker compose down -v
```

---

## 🛠️ Quick Start: Option 2 — Local Native Installation (From Scratch)

Use this method if you prefer developing directly on your host machine with hot-reloading for both backend and frontend.

### Step 1: Clone the Repository
```bash
git clone https://github.com/rashq-01/SecureDocs.git
cd SecureDocs
```

---

### Step 2: Start Required Infrastructure Services

The application requires running instances of **MongoDB**, **Redis**, and **RabbitMQ**.

#### Option A: Using lightweight Docker one-liners (Easiest)
If you have Docker installed, spin up just the backing datastores:
```bash
# Start MongoDB
docker run -d --name securedocs-mongo -p 27017:27017 mongo:6

# Start Redis
docker run -d --name securedocs-redis -p 6379:6379 redis:7-alpine

# Start RabbitMQ with Management UI
docker run -d --name securedocs-rabbitmq -p 5672:5672 -p 15672:15672 \
  -e RABBITMQ_DEFAULT_USER=securedocs \
  -e RABBITMQ_DEFAULT_PASS=securedocs_pass \
  rabbitmq:3-management-alpine
```

#### Option B: Using Native Linux Services
If you have these services installed natively via package managers (`apt`, `brew`, etc.):
```bash
sudo systemctl start mongod
sudo systemctl start redis-server
sudo systemctl start rabbitmq-server
```

---

### Step 3: Configure Backend Environment Variables

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Create your `.env` file:
   ```bash
   cp .env.example .env
   ```
3. Populate `backend/.env` with your desired configuration. Here is a battle-tested development template:

```env
PORT=5000
NODE_ENV=development

# Database & Queue Connections
MONGO_URI=mongodb://127.0.0.1:27017/securedocs
REDIS_URL=redis://127.0.0.1:6379
RABBITMQ_URL=amqp://securedocs:securedocs_pass@127.0.0.1:5672

# Authentication Secrets (Generate 32+ byte random strings)
JWT_ACCESS_SECRET=a8f9c1b2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0
JWT_REFRESH_SECRET=b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

# Rate Limiting
RATE_LIMIT_WINDOW_MIN=15
RATE_LIMIT_MAX_ATTEMPTS=50

# Storage & Upload Limits
UPLOAD_DIR=./uploads
MAX_FILE_SIZE_MB=25

# Client Origin (CORS & Socket Handshake)
FRONTEND_ORIGIN=http://localhost:5173

# Cryptography (REQUIRED: 64-character hex string for AES-256-GCM)
ENCRYPTION_KEY=a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f90
SIGNATURE_SECRET=super_secret_signature_key_for_hmac_2026

# AI LLM Integration (Optional - simulated fallback works automatically if blank)
OPENROUTER_API_KEY=
GEMINI_API_KEY=
```

> 💡 **Tip — Generate Secure Random Secrets:**
> ```bash
> node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
> ```

---

### Step 4: Install Backend Dependencies
```bash
npm install
```

---

### Step 5: Seed the Database with Initial Data
Run the seeding script to initialize default users, cases, sample files, version logs, and audit trails:
```bash
npm run seed
```
*(Or use `npm run reset` if you need to wipe existing collections and re-seed from scratch)*.

---

### Step 6: Start the Backend API Server
```bash
npm run dev
```
The server will start on **`http://localhost:5000`**.  
Verify by checking `http://localhost:5000/health` in your browser.

---

### Step 7: Start the Asynchronous AI Background Worker
Open a **new terminal window** and run the dedicated worker process:
```bash
cd backend
npm run worker
```
You should see:
```text
🚀 Starting AI Worker Process...
✅ Connected to MongoDB
✅ Connected to RabbitMQ
🎧 Waiting for messages in queue: AI_TASKS
```

---

### Step 8: Configure and Start the Frontend Client

1. Open a **third terminal window** and navigate to the frontend folder:
   ```bash
   cd frontend
   ```
2. Create `frontend/.env`:
   ```bash
   cp .env.example .env
   ```
   Ensure it contains:
   ```env
   VITE_API_URL=http://localhost:5000/api/v1
   VITE_SOCKET_URL=http://localhost:5000
   ```
3. Install frontend dependencies:
   ```bash
   npm install
   ```
4. Start the Vite development server:
   ```bash
   npm run dev
   ```
5. Open your browser at:
   ```text
   http://localhost:5173
   ```

---

## 👤 Pre-Seeded Demo Accounts & Role Matrix

The database seeder automatically creates accounts representing all five core operational roles. All accounts share the same default password: **`password123`**.

### Demo User Accounts

| Name | Role | Email | Password | Department / Primary Duty |
|---|---|---|---|---|
| **Admin User** | `Admin` | `admin@mha.gov.in` | `password123` | Headquarters — Full administrative control, user & role management, system audits |
| **IO Sharma** | `IO` | `io@mha.gov.in` | `password123` | Mumbai Division — Investigating Officer (assigned to cases `FIR-2026-001`, `002`, `004`) |
| **IO Verma** | `IO` | `io2@mha.gov.in` | `password123` | Delhi Division — Investigating Officer (assigned to cases `FIR-2026-002`, `003`) |
| **Reviewer Patel** | `Reviewer` | `reviewer@mha.gov.in` | `password123` | Mumbai Division — Case reviewer, document approvals, status management |
| **Legal Liaison Singh** | `LegalLiaison` | `legal@mha.gov.in` | `password123` | Legal Cell — Court submissions, approved document exports |
| **Auditor Gupta** | `Auditor` | `auditor@mha.gov.in` | `password123` | Audit Department — Read-only access to audit logs, compliance oversight |

---

### RBAC Permission Matrix

The application strictly enforces permissions through `permissionMatrix.js` and `rbac.middleware.js`:

| Action | Admin | Investigating Officer (IO) | Department Reviewer | Legal Liaison | Auditor |
|---|:---:|:---:|:---:|:---:|:---:|
| **Upload Document** | ✅ | ✅ *(Assigned Cases)* | ❌ | ❌ | ❌ |
| **View Document Details** | ✅ | ✅ *(Assigned Cases)* | ✅ *(Departmental)* | ✅ *(Approved)* | ⚠️ *(Metadata only)* |
| **Download Document** | ✅ | ✅ *(Assigned Cases)* | ✅ *(Departmental)* | ✅ *(Approved)* | ❌ |
| **Change Lifecycle Status** | ✅ | ❌ | ✅ *(UnderReview ➔ Approved/Rejected)* | ❌ | ❌ |
| **Digital Sign Approval** | ✅ | ❌ | ✅ | ❌ | ❌ |
| **Create New Case** | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Assign Officers to Cases** | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Create Version Update** | ✅ | ✅ *(Assigned Cases)* | ❌ | ❌ | ❌ |
| **Create Share Link** | ✅ | ✅ *(Assigned Cases)* | ❌ | ❌ | ❌ |
| **Request File Access** | ✅ | ✅ | ✅ | ✅ | ❌ |
| **Approve Access Request** | ✅ | ❌ | ❌ | ❌ | ❌ |
| **View Audit Trails** | ✅ | ❌ | ❌ | ❌ | ✅ |
| **Verify Audit Integrity** | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Manage Users & Roles** | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Archive / Soft Delete** | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Restore / Permanent Delete** | ✅ | ❌ | ❌ | ❌ | ❌ |

---

### Pre-Seeded Demonstration Cases

- **`FIR-2026-001`**: Document Tampering Investigation (Mumbai Division — High Priority)
- **`FIR-2026-002`**: Digital Evidence Chain of Custody (Mumbai Division — Critical Priority)
- **`FIR-2026-003`**: Cyber Crime Investigation (Delhi Division — High Priority)
- **`FIR-2026-004`**: Evidence Log Audit (Mumbai Division — Medium Priority)

---

## ⚙️ Environment Variables Reference

### Backend (`backend/.env`)

| Variable | Type | Default | Required? | Description |
|---|---|---|:---:|---|
| `PORT` | Number | `5000` | No | HTTP listening port for Express API |
| `NODE_ENV` | String | `development` | No | Environment mode (`development` or `production`) |
| `MONGO_URI` | URI | `mongodb://localhost:27017/securedocs` | **Yes** | MongoDB connection string |
| `REDIS_URL` | URI | `redis://localhost:6379` | **Yes** | Redis connection string |
| `RABBITMQ_URL` | URI | `amqp://securedocs:securedocs_pass@127.0.0.1:5672` | No | RabbitMQ AMQP broker URI |
| `JWT_ACCESS_SECRET` | String | — | **Yes** | Secret used to sign short-lived access tokens |
| `JWT_REFRESH_SECRET`| String | — | **Yes** | Secret used to sign long-lived refresh tokens |
| `JWT_ACCESS_EXPIRY` | String | `15m` | No | Access token expiration duration |
| `JWT_REFRESH_EXPIRY`| String | `7d` | No | Refresh token expiration duration |
| `RATE_LIMIT_WINDOW_MIN` | Number | `15` | No | Sliding window in minutes for rate limiter |
| `RATE_LIMIT_MAX_ATTEMPTS` | Number | `5` | No | Max login attempts allowed per window before block |
| `UPLOAD_DIR` | Path | `./uploads` | No | Local directory where encrypted files are stored |
| `MAX_FILE_SIZE_MB` | Number | `25` | No | Maximum permitted file upload size in megabytes |
| `FRONTEND_ORIGIN` | URL | `http://localhost:5173` | No | Allowed CORS origin & Socket.IO handshake origin |
| `ENCRYPTION_KEY` | Hex (64 chars) | — | **Yes** | 32-byte AES-256-GCM symmetric master key |
| `SIGNATURE_SECRET` | String | — | **Yes** | Secret key used for HMAC-SHA256 digital signatures |
| `OPENROUTER_API_KEY` | String | — | No | Optional API key for OpenRouter LLM queries |
| `GEMINI_API_KEY` | String | — | No | Optional Google Gemini API key for summaries |

### Frontend (`frontend/.env`)

| Variable | Type | Default | Description |
|---|---|---|---|
| `VITE_API_URL` | URL | `http://localhost:5000/api/v1` | Base REST API endpoint |
| `VITE_SOCKET_URL` | URL | `http://localhost:5000` | Socket.IO server connection URL |
| `VITE_APP_NAME` | String | `SecureDocs` | Application branding title |
| `VITE_APP_VERSION`| String | `1.0.0` | Application release version |

---

## ⚡ Asynchronous AI Pipeline (RabbitMQ Worker)

### Why Asynchronous Processing?
Large PDF text extractions, image OCR operations, and remote LLM API calls typically take **3 to 10 seconds**. Synchronously executing them inside the upload HTTP handler would degrade user experience and risk HTTP timeouts.

### Task Flow
1. **Upload Execution:** The user uploads an evidence document via `POST /api/v1/documents`.
2. **Immediate Success:** The backend stores the file (AES-256-GCM encrypted), generates a SHA-256 hash, writes an `Upload` audit log, and returns `201 Created` immediately.
3. **Queue Dispatch:** The backend publishes a task payload to the RabbitMQ queue `AI_TASKS`:
   ```json
   {
     "type": "SUMMARIZE_AND_CLASSIFY",
     "payload": { "documentId": "65fc8e29..." },
     "requestedAt": "2026-09-09T10:00:00.000Z"
   }
   ```
4. **Worker Consumption:** `aiWorker.js` picks up the message, decrypts the file in memory, and extracts text:
   - For **PDFs**: Uses `pdf-parse` with a safety timeout.
   - For **Images (PNG, JPG)**: Invokes `Tesseract.js` OCR.
   - For **Text Files**: Directly parses UTF-8 buffers.
5. **LLM Prompting:** Invokes OpenRouter / Gemini API to obtain an executive summary and suggested category.
6. **Live Notification:** The document record is updated in MongoDB, and a Socket.IO event is broadcast through Redis pub/sub to notify the user in real time.
7. **Fault Tolerant Fallback:** If the external LLM is offline or no API key is provided, the worker automatically provides a simulated summary and never crashes the system.

---

## 🔒 Security & Cryptography Deep Dive

### 1. Document Encryption (AES-256-GCM)
Documents are never stored in plaintext. When Multer receives a file buffer:
```
Plaintext Buffer ➔ crypto.createCipheriv('aes-256-gcm', key, iv) ➔ [IV (16B)] + [Auth Tag (16B)] + [Encrypted Data]
```
During retrieval, `decryptBuffer` separates the 16-byte initialization vector (IV) and the 16-byte GCM authentication tag. If even a single bit of the file has been altered or corrupted on disk, GCM authentication fails and rejects decryption.

### 2. SHA-256 Cryptographic Tamper Evidence
1. **On Upload:** `crypto.createHash('sha256').update(buffer).digest('hex')` calculates a hash stored permanently in `Document.fileHash`.
2. **On Download / Preview:** The server retrieves the file from disk, decrypts it, re-computes the SHA-256 hash, and performs a `crypto.timingSafeEqual` comparison against `fileHash`.
3. **On Tamper Detection:** If the hash does not match:
   - The file download is blocked.
   - `Document.tamperFlag` is set to `true`.
   - A critical audit log event (`TamperDetected`) is written.
   - A real-time Socket.IO alert is broadcast to the Admin dashboard.

### 3. HMAC-SHA256 Digital Approval Signatures
When a reviewer approves a document:
```javascript
const dataToSign = `${documentHash}:${reviewerId}:${timestamp.toISOString()}`;
const signature = crypto.createHmac('sha256', SIGNATURE_SECRET).update(dataToSign).digest('hex');
```
Any officer can independently verify the signature at `GET /api/v1/documents/:id/verify-signature`.

### 4. Dynamic Watermarking
To stop unauthorized physical distribution:
- **PDFs:** `pdf-lib` injects diagonal translucent red text across every page showing `CONFIDENTIAL | Previewed by <email> | Date: <date> | IP: <ip>`.
- **Images:** `sharp` creates an SVG overlay centered at a 45-degree angle.

---

## 📡 Complete REST API Reference

Base API Route: **`/api/v1`**  
All protected endpoints require an `Authorization: Bearer <access_token>` header.

### Authentication (`/auth`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/auth/login` | Public | Authenticate with email/password; returns access & refresh tokens |
| `POST` | `/auth/refresh` | Public | Exchange refresh token for a new access token |
| `POST` | `/auth/logout` | Authenticated | Blacklists current JWT in Redis and invalidates session |

### Documents (`/documents`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/documents` | IO, Admin | Upload new document with metadata (multipart/form-data) |
| `GET` | `/documents` | RBAC-filtered | List documents accessible to the caller's role/cases |
| `GET` | `/documents/:id` | RBAC-checked | Fetch document metadata, status, and AI summary |
| `GET` | `/documents/:id/preview` | RBAC-checked | Fetch watermarked document buffer for in-browser viewing |
| `GET` | `/documents/:id/download` | RBAC-checked | Re-verifies SHA-256 hash, watermarks, logs download, streams file |
| `GET` | `/documents/:id/verify-signature` | RBAC-checked | Cryptographically validates document approval signature |
| `PATCH` | `/documents/:id/status` | Reviewer, Admin | Transition document lifecycle status (`UnderReview`, `Approved`, `Rejected`) |
| `POST` | `/documents/:id/archive` | Admin | Soft-archive document |
| `POST` | `/documents/:id/delete` | Admin | Soft-delete document |
| `POST` | `/documents/:id/restore` | Admin | Restore archived or deleted document |
| `DELETE` | `/documents/:id/permanent` | Admin | Permanently purge file from storage and database |

### Version Management (`/documents/:documentId/versions`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/:documentId/versions` | RBAC-checked | List all historical versions with changelogs and hashes |
| `GET` | `/:documentId/versions/:versionNumber` | RBAC-checked | Get metadata for a specific version |
| `GET` | `/:documentId/versions/:versionNumber/download` | RBAC-checked | Download specific historical version file |
| `POST` | `/:documentId/versions` | IO, Admin | Upload a new version of an existing document |

### Temporary Shares (`/shares`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/shares` | IO, Admin | Create expiring share link with permissions & download limit |
| `GET` | `/shares/me` | Authenticated | List all shares granted to current user |
| `GET` | `/shares/created-by-me` | Authenticated | List all shares generated by current user |
| `GET` | `/shares/validate/:token` | Public | Validate if share token is active and unexpired |
| `GET` | `/shares/access/:token` | Authenticated | Access/download shared document content |
| `DELETE`| `/shares/:token/revoke` | Creator, Admin | Immediately revoke an active share |

### Delegated Access Requests (`/access-requests`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/access-requests` | Authenticated | Submit request for temporary access to a restricted document |
| `GET` | `/access-requests/me` | Authenticated | View current user's submitted requests and statuses |
| `GET` | `/access-requests/document/:id/pending` | Admin | View pending requests for a document |
| `PATCH` | `/access-requests/:id/approve` | Admin | Approve request and issue time-limited access token |
| `PATCH` | `/access-requests/:id/reject` | Admin | Reject access request with explanation |

### Cases & Investigations (`/cases`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/cases` | Admin | Register new case (`caseId`, `title`, `department`) |
| `GET` | `/cases` | RBAC-filtered | List cases (IOs see assigned; Reviewers see department; Admin sees all) |
| `GET` | `/cases/:id` | RBAC-checked | Get case details and linked documents |
| `PATCH` | `/cases/:id/status` | Admin | Update case status (`Open`, `InProgress`, `Closed`) |
| `POST` | `/cases/:id/members` | Admin | Assign investigating officers to the case |
| `DELETE`| `/cases/:id/members/:userId` | Admin | Remove an officer from the case |

### Audit & Security Logs (`/audit-logs`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/audit-logs` | Auditor, Admin | Query append-only audit logs with filters |
| `GET` | `/audit-logs/verify` | Admin | Verify cryptographic integrity across audit records |
| `GET` | `/audit-logs/export` | Auditor, Admin | Export compliance audit report (CSV / JSON) |
| `GET` | `/audit-logs/security-events`| Admin | Query filtered high-severity security events |

### Admin & Security Operations (`/admin` & `/security`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/admin/dashboard-stats` | Admin | System-wide statistics (users, cases, docs, alerts) |
| `GET` | `/admin/users` | Admin | List all registered users |
| `POST` | `/admin/users` | Admin | Create a new user account |
| `PATCH` | `/admin/users/:id/role` | Admin | Update a user's role |
| `PATCH` | `/admin/users/:id/toggle-active`| Admin | Enable or disable user account |
| `GET` | `/security/dashboard` | Admin | Fetch live threat telemetry and anomaly stats |
| `GET` | `/security/suspicious` | Admin | Fetch suspicious activity alerts |

---

## 🌐 Real-Time WebSockets (Socket.IO)

SecureDocs incorporates a Socket.IO real-time event layer connected to Redis Pub/Sub:

### Connection Handshake
Clients authenticate during the WebSocket handshake by providing their access token:
```javascript
const socket = io('http://localhost:5000', {
  auth: { token: accessToken }
});
```

### Room Architecture
- **`admin-room`**: Receives all system-wide audit logs and security alerts.
- **`dept:<DepartmentName>`**: Receives departmental notifications (e.g. status changes).
- **`case:<caseId>`**: Receives events scoped to a specific case file.
- **`user:<userId>`**: Direct notifications to a specific officer.

### Primary Events
| Event Name | Direction | Description |
|---|---|---|
| `activity:new` | Server ➔ Client | Emitted when any audited action occurs (live feed update) |
| `document:statusChanged` | Server ➔ Client | Emitted when a document is approved, rejected, or submitted |
| `tamper:alert` | Server ➔ Client | Critical alert when a SHA-256 hash mismatch is detected |
| `security:alert` | Server ➔ Client | Real-time threat alert from the rule engine or AI anomaly detector |

---

## 📂 Repository File Structure

```text
SecureDocs/
├── docker-compose.yml              # Root Docker Compose (Full Stack: 7 services)
├── README.md                       # Comprehensive project documentation
├── ARCHITECTURE.md                 # Detailed architectural blueprint
├── PRD.md                          # Official Product Requirements Document
├── AI_FEATURES.md                  # Async AI & RabbitMQ architectural design
│
├── backend/                        # Express.js REST API & AI Worker
│   ├── Dockerfile                  # Container definition for backend and worker
│   ├── package.json                # Dependencies and npm execution scripts
│   ├── .env.example                # Backend environment template
│   ├── uploads/                    # Local encrypted file repository (gitignored)
│   ├── scripts/
│   │   ├── seed.js                 # Initial demo database populator
│   │   └── reset.js                # Database wipe and re-seed utility
│   └── src/
│       ├── app.js                  # Express middleware setup & route mounting
│       ├── server.js               # HTTP + Socket.IO server bootstrap
│       ├── config/
│       │   ├── db.js               # Mongoose MongoDB connection
│       │   ├── env.js              # Environment variable validator
│       │   ├── redis.js            # Redis client connection
│       │   └── rabbitmq.js         # RabbitMQ connection & reconnect logic
│       ├── controllers/            # API request handlers
│       ├── middlewares/            # JWT, RBAC, RateLimit, Upload, Validation
│       ├── models/                 # Mongoose schemas (User, Document, Case, AuditLog...)
│       ├── queues/                 # RabbitMQ queue definitions (aiTasks.queue.js)
│       ├── routes/                 # Express route definitions
│       ├── services/               # Encryption, hashing, signatures, watermarks, audit
│       ├── sockets/                # Socket.IO connection and room handlers
│       ├── utils/                  # Permission matrix, API response helpers, loggers
│       └── workers/
│           └── aiWorker.js         # RabbitMQ AI background consumer process
│
└── frontend/                       # React 18 + Vite Web Application
    ├── Dockerfile                  # Multi-stage production build (Node build + Nginx)
    ├── nginx.conf                  # Nginx reverse proxy configuration
    ├── package.json                # Frontend UI dependencies
    ├── vite.config.js              # Vite bundler configuration
    ├── tailwind.config.js          # Tailwind CSS configuration
    ├── .env.example                # Frontend environment template
    ├── index.html                  # HTML entry template
    └── src/
        ├── App.jsx                 # Route definitions & layout wrappers
        ├── main.jsx                # Application root entry
        ├── components/             # Reusable UI widgets
        │   ├── access/             # Access requests & modal forms
        │   ├── audit/              # AuditLog tables & compliance view
        │   ├── auth/               # Login & ProtectedRoute wrappers
        │   ├── cases/              # Case creation & officer assignment
        │   ├── common/             # Navbar, RoleGate, badges, buttons
        │   ├── dashboard/          # Role-specific dashboards & live feeds
        │   ├── documents/          # Document upload, detail, viewer, versions
        │   └── security/           # SOC threat dashboard & anomaly viewer
        ├── context/                # AuthContext & SocketContext
        ├── pages/                  # Top-level view pages
        └── services/               # Axios API callers & endpoints
```

---

## 🗄️ Database Maintenance & Reset Scripts

From the `backend` directory, use these utility commands:

### Populate Demo Data
```bash
cd backend
npm run seed
```
Checks if data already exists; if not, seeds initial users, cases, and mock documents.

### Hard Reset & Re-Seed
```bash
cd backend
npm run reset
```
> ⚠️ **Caution:** This drops existing MongoDB collections, clears Redis caches, regenerates all demo documents with fresh cryptographic hashes, and seeds full version histories.

---

## ❓ Comprehensive Troubleshooting & FAQ

### 1. `Missing required environment variables: ...`
- **Cause:** The backend requires `MONGO_URI`, `REDIS_URL`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `SIGNATURE_SECRET`, and `ENCRYPTION_KEY`.
- **Fix:** Ensure `backend/.env` exists and contains all required values. Check the [Environment Variables Reference](#-environment-variables-reference).

### 2. Port Conflict Errors (`EADDRINUSE`)
- **Port 5000 (Backend):** Stop any process using port 5000:
  ```bash
  sudo lsof -i :5000
  kill -9 <PID>
  ```
- **Port 5173 (Frontend):** Vite will automatically attempt port 5174 if 5173 is occupied. Update `FRONTEND_ORIGIN` in `backend/.env` if your port changes.
- **Port 80 (Docker Nginx):** If another web server (Apache/Nginx) is running locally:
  ```bash
  sudo systemctl stop nginx
  ```

### 3. MongoDB Connection Refused (`ECONNREFUSED 127.0.0.1:27017`)
- Ensure MongoDB is running:
  ```bash
  docker ps | grep mongo
  # or
  sudo systemctl status mongod
  ```
- If using MongoDB Atlas, verify that your IP address is whitelisted in Atlas Network Access.

### 4. Redis Connection Refused (`ECONNREFUSED 127.0.0.1:6379`)
- Redis is mandatory for rate limiting and token revocation. Start Redis:
  ```bash
  docker run -d --name securedocs-redis -p 6379:6379 redis:7-alpine
  ```

### 5. RabbitMQ Connection Warning (`Failed to connect to RabbitMQ`)
- The backend features graceful degradation: if RabbitMQ is offline, the main REST API will still function normally, but background AI jobs will not be dispatched.
- Verify RabbitMQ is running on port 5672:
  ```bash
  docker ps | grep rabbitmq
  ```

### 6. Frontend Shows CORS or Network Error
- Verify that `VITE_API_URL` in `frontend/.env` matches the backend address (e.g. `http://localhost:5000/api/v1`).
- Verify that `FRONTEND_ORIGIN` in `backend/.env` matches the frontend address (e.g. `http://localhost:5173`).
- Restart the Vite dev server after changing any `.env` file.

---

## 🛡️ Production Hardening & Deployment

When deploying SecureDocs in an actual operational environment:

1. **TLS / SSL Termination:** Terminate HTTPS at the Nginx reverse proxy using valid certificates (e.g., Let's Encrypt / Certbot).
2. **KMS / HSM Integration:** Replace the static `ENCRYPTION_KEY` in `.env` with a Hardware Security Module (HSM) or cloud Key Management Service (AWS KMS, Google Cloud KMS, or HashiCorp Vault) with envelope encryption.
3. **Dedicated Object Storage:** Transition the local `./uploads` directory to an S3-compatible bucket (MinIO on-premise or AWS S3) with server-side encryption (`SSE-KMS`).
4. **Append-Only Database Users:** In MongoDB, configure a dedicated database user for the `auditlogs` collection restricted exclusively to `insert` and `find` operations to enforce audit immutability at the engine level.
5. **Secrets Rotation:** Periodically rotate `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, and `SIGNATURE_SECRET`.

---

## 📜 License & Acknowledgments

This software is developed for the **Ministry of Home Affairs (MHA), Government of India** as part of the **Smart India Hackathon 2026 (Problem Statement: SIH26190)**.

Designed and engineered with a **zero-trust, defense-in-depth** philosophy to protect the integrity of active investigations and judicial evidence.
