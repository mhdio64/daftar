# 🗂️ Daftar (دفتر)

> **Secure, centralized enterprise IT asset management, secrets vault, technical documentation, and renewal automation platform.**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?logo=docker&logoColor=white)](docker-compose.yml)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791?logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Node.js](https://img.shields.io/badge/Node.js-20+-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)

---

## 🎯 Introduction

In many organizations and engineering teams, critical IT infrastructure details—such as virtual servers (VPS), SSH root credentials, database connection strings, cloud IAM tokens, software licenses, domain registrations, and network topology—are scattered across insecure spreadsheets, plaintext files, or internal chats. This creates serious vulnerabilities: **credential exposure, unmonitored access, missed expiration dates leading to downtime, and loss of institutional knowledge.**

**Daftar** is a self-hosted, enterprise-grade IT Asset & Secrets Vault built with field-level **AES-256-GCM encryption**, zero-knowledge **2FA (TOTP)**, comprehensive **audit logging (secret unmask tracking)**, physical **asset QR/barcode tagging**, and multi-channel **expiration notification workers** (Telegram, Bale, Discord, SMS, Email, Webhook).

---

## ✨ Key Features

- 🔐 **Field-Level Encryption (AES-256-GCM):** Sensitive values (passwords, private keys, API secrets) are encrypted before hitting the database. Plaintext is never stored in database dumps.
- 🛡️ **Zero-Knowledge Two-Factor Authentication (2FA / RFC 6238):** Compatible with Google Authenticator, Microsoft Authenticator, and 1Password.
- 👁️ **Secret Unmask & Copy Tracking (Audit Trail):** Every reveal/copy action is logged with user ID, timestamp, and IP address.
- 🏷️ **Physical Asset Tagging & Label Printing:** QR/barcode stickers with in-app mobile camera scanner.
- ⏰ **Automated Expiration Alerts:** Notifications 30 days, 7 days, 24 hours before expiry via **Telegram, Bale, Discord, SMS, Email, and Webhooks**.
- 📊 **Multi-Sheet Excel Export:** One-click `.xlsx` export with one sheet per asset type, financial summary dashboard, and professional RTL styling.
- 👥 **Role-Based Access Control (RBAC):** Granular `ADMIN`, `EDITOR`, and `VIEWER` roles with per-category restrictions.
- 🛡️ **OWASP Hardened:** SSRF, BOLA/IDOR, brute-force throttling, security headers, 8-hour JWT expiration.
- 📦 **Automated Daily Backups:** Keeps last 7 daily compressed `.sql.gz` dumps automatically.

---

## 🚀 Quick Start — Docker (Recommended)

### 1. Clone the repository
```bash
git clone https://github.com/mhdio64/daftar.git
cd daftar
```

### 2. Configure environment variables
```bash
cp .env.production.example .env
nano .env   # Edit the values below
```

> [!IMPORTANT]
> Generate secure secrets before deploying using `openssl` (pre-installed on all Linux servers):
> ```bash
> # Generate JWT_SECRET and MASTER_ENCRYPTION_KEY (run twice — 64 hex characters):
> openssl rand -hex 32
>
> # Generate a strong PostgreSQL password (32 hex chars, URL/connection-string safe):
> openssl rand -hex 16
> ```
> Paste the outputs into your `.env` file.

### 3. Start everything
```bash
docker compose up -d --build
```

> [!NOTE]
> On first start, the server **automatically runs database migrations**.
> No manual migration step is needed — `entrypoint.sh` handles it.

### 4. Access the application

| | |
|---|---|
| **URL** | `https://YOUR_SERVER_IP` |
| **Default user** | `admin` |
| **Default password** | `admin123456` |

> [!WARNING]
> Change the default password immediately after first login via **User Management**.

---

## 💻 Local Development Setup

### Prerequisites
- **Node.js** >= 20.0.0
- **pnpm** >= 9.0.0 (`npm install -g pnpm`)
- **Docker** (for PostgreSQL only)

### Steps

```bash
# 1. Install dependencies
pnpm install

# 2. Configure environment (point DATABASE_URL to localhost)
cp .env.production.example .env

# 3. Start only the database
docker compose up -d postgres

# 4. Push schema to database
pnpm --filter daftar-server exec prisma db push

# 5. Start frontend + backend with hot reload
pnpm dev
```

| Service | URL |
|---------|-----|
| Frontend (Vite HMR) | `http://localhost:5173` |
| Backend API | `http://localhost:3000` |

---

## 🔄 Updating the Application

### Scenario 1 — Server with internet access

Use the included update script. It **automatically backs up the database** before applying any changes:

```bash
bash update.sh
```

**What happens step by step:**

```
bash update.sh
    │
    ├─ 📦 Backup database  →  pre_update_backup_YYYYMMDD.sql.gz
    ├─ 🔄 git pull          →  fetch latest code
    ├─ 🔨 docker compose up -d --build  →  rebuild containers
    └─ ✅ entrypoint.sh runs prisma migrate deploy automatically
```

> [!TIP]
> Data is always safe — it lives in **Docker volumes**, not inside containers.
> Rebuilding or removing containers never deletes your data.

---

### Scenario 2 — Server without internet (internal / air-gapped network)

Run this **on your laptop** (which has internet), not on the server:

```bash
bash deploy_offline.sh <SERVER_IP> [SSH_USER]

# Example:
bash deploy_offline.sh 192.168.1.100 admin
```

**What happens automatically:**

```
Your laptop (has internet)              Internal server (no internet)
──────────────────────────              ─────────────────────────────
git pull
    ↓
docker compose build
    ↓
docker save → .tar.gz
    ↓
scp + rsync ─────────────────────────→ Receive files
                                             ↓
                                        📦 Backup database
                                             ↓
                                        docker load (images)
                                             ↓
                                        docker compose up -d
                                             ↓
                                        ✅ Update complete
```

> [!NOTE]
> **Prerequisite:** SSH access from your laptop to the server over the local network (LAN/VPN).

---

### How to rollback if something goes wrong

```bash
# 1. Find the previous commit
git log --oneline -5

# 2. Go back to it
git checkout <previous-commit-hash>

# 3. Rebuild with old code
docker compose up -d --build

# 4. If the database schema was also changed, restore from backup:
gunzip < pre_update_backup_YYYYMMDD.sql.gz \
  | docker compose exec -T postgres psql -U daftar_user -d daftar_db
```

---

## 📦 Backup & Restore

### Automatic daily backups

A dedicated container runs every 24 hours and retains the **last 7 backups** automatically:

```
/backups/
  daftar_backup_20241007_030000.sql.gz  ← newest
  daftar_backup_20241006_030000.sql.gz
  daftar_backup_20241005_030000.sql.gz
  daftar_backup_20241004_030000.sql.gz
  daftar_backup_20241003_030000.sql.gz
  daftar_backup_20241002_030000.sql.gz
  daftar_backup_20241001_030000.sql.gz  ← oldest (7th, then deleted)
```

> No configuration needed — disk usage stays fixed at `7 × database size`.

### Manual backup

```bash
docker compose exec postgres pg_dump -U daftar_user daftar_db \
  | gzip > backup_$(date +%Y%m%d_%H%M%S).sql.gz
```

### Restore from SQL dump

```bash
gunzip < daftar_backup_YYYYMMDD_HHMMSS.sql.gz \
  | docker compose exec -T postgres psql -U daftar_user -d daftar_db
```

### Application-level backup (JSON bundle)

Administrators can export/import a full data bundle from:
**Settings → Backup & Restore**

This includes all asset types, assets, tags, and settings — useful for cross-instance migration.

---

## 🏗️ Architecture Overview

```
Browser
   │
   ▼ HTTPS :443
┌──────────────────────┐
│  Caddy               │  ← TLS termination, serves React SPA,
│  (reverse proxy)     │    proxies /api/* to backend
└──────────┬───────────┘
           │ /api/*
           ▼
┌──────────────────────┐
│  Fastify API Server  │  ← JWT auth, AES-256-GCM encryption,
│  (Node.js 20)        │    audit logging, RBAC
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐     ┌────────────────────────┐
│  PostgreSQL 16       │     │  Backup Worker         │
│  (persistent volume) │     │  Daily .sql.gz, last 7 │
└──────────────────────┘     └────────────────────────┘
```

**Docker volumes — data persists across all updates:**

| Volume | Contents |
|--------|----------|
| `postgres_data` | All database records |
| `uploads_data` | Uploaded files and attachments |
| `backups_data` | Automated daily SQL dumps |
| `client_dist` | Built React SPA (recreated on each update) |

---

## 🔒 Security Checklist

- [ ] Change default `admin` password after first login
- [ ] Enable 2FA in **Settings → Security** and store recovery codes offline
- [ ] Set unique `JWT_SECRET` and `MASTER_ENCRYPTION_KEY` in `.env`
- [ ] Set a strong `POSTGRES_PASSWORD` (not the example default)
- [ ] Firewall: expose only ports `80` and `443`; keep `5432` internal
- [ ] Never commit `.env` — it is in `.gitignore`

---

## 📚 Technical Documentation

- [01. Architecture & Stack](./docs/01-architecture-and-stack.md)
- [02. Data Model & Schema](./docs/02-data-model-and-schema.md)
- [03. Security & Cryptography](./docs/03-security-and-encryption.md)
- [04. UI/UX & Design Guidelines](./docs/04-ui-ux-and-components.md)
- [05. Core Features Specification](./docs/05-core-features-spec.md)
- [06. Deployment & Operations](./docs/06-deployment-and-operations.md)

---

## 📜 License

This project is licensed under the [MIT License](LICENSE).
