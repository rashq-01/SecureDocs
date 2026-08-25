# SecureDocs

SecureDocs is a secure digital document management system for legal and investigation workflows. It provides authentication, role-based access control, case management, encrypted document storage, document versioning, controlled sharing, access requests, audit trails, security monitoring, Redis-based rate limiting, and real-time updates.

## Features

- JWT authentication with refresh-token flow
- Role-based access control (RBAC)
- Case and investigation management
- Document upload, download, archive, restore, and deletion
- AES-256-GCM encrypted document storage
- SHA-256 integrity verification
- Document versioning
- Document-level permissions
- Access request and approval workflow
- Temporary document sharing with expiry
- Redis-backed rate limiting
- Security events and suspicious-activity monitoring
- Audit logging and audit-integrity verification
- Real-time updates with Socket.IO
- React frontend with role-aware dashboards
- Docker setup for MongoDB, Redis, and the backend

## Tech Stack

### Frontend
- React
- Vite
- React Router
- Axios
- Zustand
- Socket.IO Client
- Tailwind CSS

### Backend
- Node.js
- Express.js
- MongoDB
- Mongoose
- Redis
- Socket.IO
- JWT
- bcrypt
- Multer
- Helmet
- express-validator

## Project Structure

```text
SecureDocs/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   ├── controllers/
│   │   ├── jobs/
│   │   ├── middlewares/
│   │   ├── models/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── sockets/
│   │   ├── utils/
│   │   ├── app.js
│   │   └── server.js
│   ├── scripts/
│   ├── uploads/
│   ├── Dockerfile
│   ├── docker-compose.yml
│   └── package.json
│
└── frontend/
    ├── src/
    ├── index.html
    ├── package.json
    └── vite.config.js
```

# Prerequisites

Install the following before running SecureDocs:

- Node.js 20+
- npm
- MongoDB 7+ **or Docker**
- Redis 7+ **or Docker**
- Git

Docker is recommended because the repository already contains a Docker Compose setup for MongoDB, Redis, and the backend.

# Option 1 — Run with Docker Compose

This is the easiest way to start the backend dependencies.

## 1. Clone the repository

```bash
git clone https://github.com/rashq-01/SecureDocs.git
cd SecureDocs
```

## 2. Start MongoDB, Redis, and the backend

```bash
cd backend
docker compose up --build
```

This starts:

| Service | Address |
|---|---|
| Backend API | `http://localhost:5000` |
| API base URL | `http://localhost:5000/api/v1` |
| Health check | `http://localhost:5000/health` |
| MongoDB | `localhost:27017` |
| Redis | `localhost:6379` |

Keep this terminal running.

## 3. Start the frontend

Open another terminal:

```bash
cd frontend
npm install
npm run dev
```

The frontend will normally be available at:

```text
http://localhost:5173
```

Open that URL in your browser.

### Frontend API configuration

The frontend defaults to:

```text
/api/v1
```

If the frontend is running directly with Vite while the backend is running on port `5000`, create:

```text
frontend/.env
```

with:

```env
VITE_API_URL=http://localhost:5000/api/v1
```

Then restart Vite:

```bash
npm run dev
```

# Option 2 — Run Everything Without Docker

Use this option if MongoDB and Redis are already installed and running locally.

## 1. Clone the repository

```bash
git clone https://github.com/rashq-01/SecureDocs.git
cd SecureDocs
```

## 2. Start MongoDB

Make sure MongoDB is running on:

```text
mongodb://127.0.0.1:27017
```

## 3. Start Redis

Make sure Redis is running on:

```text
redis://127.0.0.1:6379
```

## 4. Configure the backend

Create:

```text
backend/.env
```

Example:

```env
NODE_ENV=development
PORT=5000

MONGO_URI=mongodb://127.0.0.1:27017/securedocs
REDIS_URL=redis://127.0.0.1:6379

JWT_ACCESS_SECRET=replace_with_a_long_random_secret
JWT_REFRESH_SECRET=replace_with_another_long_random_secret

JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

RATE_LIMIT_WINDOW_MIN=15
RATE_LIMIT_MAX_ATTEMPTS=5

UPLOAD_DIR=./uploads
MAX_FILE_SIZE_MB=25

FRONTEND_ORIGIN=http://localhost:5173
```

Install backend dependencies:

```bash
cd backend
npm install
```

Start the backend:

```bash
npm run dev
```

For normal execution:

```bash
npm start
```

The backend runs on:

```text
http://localhost:5000
```

## 5. Configure and start the frontend

Open another terminal:

```bash
cd frontend
npm install
```

Create:

```text
frontend/.env
```

```env
VITE_API_URL=http://localhost:5000/api/v1
```

Start the frontend:

```bash
npm run dev
```

Open:

```text
http://localhost:5173
```

# Database Seeding

The backend contains a seed script.

From the `backend` directory:

```bash
npm run seed
```

Use this only when you want to populate the database with the project's seed/demo data.

To reset the database using the provided script:

```bash
npm run reset
```

**Warning:** the reset script is destructive. Do not run it against a database containing data you want to keep.

# Health Check

Once the backend is running, open:

```text
http://localhost:5000/health
```

A healthy server should return JSON similar to:

```json
{
  "status": "ok",
  "timestamp": "...",
  "environment": "development"
}
```

# API

The backend API is mounted under:

```text
/api/v1
```

Examples:

```text
POST   /api/v1/auth/login
POST   /api/v1/auth/refresh
POST   /api/v1/auth/logout

GET    /api/v1/cases
POST   /api/v1/cases

GET    /api/v1/documents
POST   /api/v1/documents

GET    /api/v1/audit
```

The exact available routes should be treated as defined by the backend route files in:

```text
backend/src/routes/
```

# Security Model

SecureDocs is designed around several security layers:

```text
Authentication
      ↓
RBAC
      ↓
Case membership / document permissions
      ↓
Document access
      ↓
Integrity verification
      ↓
Audit logging
```

Sensitive documents are not exposed through a public static `/uploads` route. Document access is handled through authenticated application endpoints.

## Encryption

Documents are encrypted using AES-256-GCM before storage.

For environments where encryption keys are required, configure the corresponding secret/key through environment variables rather than committing secrets to Git.

Never commit real production secrets to the repository.

# Development Commands

## Backend

```bash
cd backend

npm install
npm run dev
npm start
npm run seed
npm run reset
```

## Frontend

```bash
cd frontend

npm install
npm run dev
npm run build
npm run preview
npm run lint
npm run format
```

# Production Notes

The included Docker Compose configuration is intended primarily for local development/demo use.

For production deployment, replace development secrets and local infrastructure with proper managed services and secret management.

Recommended production architecture:

```text
                    Internet
                       |
                     NGINX
                       |
              -------------------
              |        |        |
            API-1    API-2    API-3
              |        |        |
              ---------+---------
                       |
          ---------------------------
          |            |            |
       MongoDB       Redis     Object Storage
```

Do not use:

```text
JWT_ACCESS_SECRET=dev_access_secret_change_me
JWT_REFRESH_SECRET=dev_refresh_secret_change_me
```

in production.

# Troubleshooting

## Backend says environment variables are missing

Make sure:

```text
backend/.env
```

exists and contains at least:

```env
MONGO_URI=...
REDIS_URL=...
JWT_ACCESS_SECRET=...
JWT_REFRESH_SECRET=...
```

Then restart the backend.

## MongoDB connection error

Check that MongoDB is running:

```bash
docker ps
```

or verify your local MongoDB service.

The expected local URI is:

```text
mongodb://127.0.0.1:27017/securedocs
```

## Redis connection error

Check that Redis is running:

```bash
docker ps
```

The expected local URI is:

```text
redis://127.0.0.1:6379
```

## Frontend cannot reach the backend

Check:

```text
frontend/.env
```

and make sure:

```env
VITE_API_URL=http://localhost:5000/api/v1
```

Also verify:

```text
http://localhost:5000/health
```

works.

After changing `.env`, restart Vite.

## Port already in use

Backend:

```text
5000
```

Frontend:

```text
5173
```

MongoDB:

```text
27017
```

Redis:

```text
6379
```

Stop the process/container using the port or change the corresponding configuration.

# Important

Do not commit:

```text
.env
```

real secrets, production credentials, or private document files to GitHub.

For a public repository, also remove or replace any demo credentials and sensitive sample documents before publishing.

# License

Add the license you intend to use for this project.

If this repository is intended only for a hackathon or portfolio demonstration, you can explicitly state that here.
