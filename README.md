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

- 🔐 **Field-Level Encryption (AES-256-GCM):** Sensitive values (passwords, private keys, API secrets) are encrypted before hitting the database with randomized IVs and 16-byte authentication tags (Auth Tags). Plaintext is never stored in database dumps.
- 🛡️ **Zero-Knowledge Two-Factor Authentication (2FA / RFC 6238):** Compatible with Google Authenticator, Microsoft Authenticator, and 1Password. TOTP secrets are encrypted at rest with AES-256, and emergency recovery codes are one-way hashed with SHA-256.
- 👁️ **Secret Unmask & Copy Tracking (Audit Trail):** Every time a user clicks the reveal/eye icon or copies a secret to the clipboard, an audit record is logged with the user's ID, timestamp, and IP address.
- 🏷️ **Physical Asset Tagging & Label Printing:** Generate printable, standardized asset stickers with corporate logos, unique asset codes, titles, and QR/barcodes. Includes an in-app mobile camera scanner.
- ⏰ **Automated Expiration Alerts (Notification Worker):** Built-in background worker that dispatches threshold notifications (30 days, 7 days, 24 hours, and day of expiration) to **Telegram, Bale, Discord, SMS, Email, and custom Webhooks**, plus automated weekly digest summaries.
- 📊 **Excel & PDF Dossier Exports:** One-click `.xlsx` exports for accounting and auditing, template generation for bulk imports, and formatted printable official asset dossier views.
- 👥 **Role-Based & Category-Based Access Control (RBAC & ABAC):** Granular permission model separating `ADMIN`, `EDITOR`, and `VIEWER`, with per-category access restrictions.
- 🛡️ **OWASP Hardened:** Includes protection against Server-Side Request Forgery (SSRF), Broken Object-Level Authorization (BOLA/IDOR), session hijacking (8-hour JWT expiration), brute-force throttling (`@fastify/rate-limit`), and security headers (`@fastify/helmet`).
- 📦 **Automated Daily Backups:** Isolated Docker container generating daily compressed `.sql.gz` database dumps with automated 30-day retention rotation.

---

## 🚀 Quick Start with Docker (Recommended)

The easiest and most secure method to deploy Daftar on your internal network or VPS is using **Docker Compose**:

### 1. Clone the repository
```bash
git clone https://github.com/mhdio64/daftar.git
cd daftar
```

### 2. Configure Environment Variables
Copy the sample environment file:
```bash
cp .env.example .env
```

> [!IMPORTANT]
> Generate a cryptographically secure 32-byte (64 hexadecimal characters) master encryption key:
> ```bash
> openssl rand -hex 32
> ```
> Paste this key into the `MASTER_ENCRYPTION_KEY` variable in your `.env` file.

### 3. Start the Services
```bash
docker compose up -d
```

This launches:
- **PostgreSQL 16** database container
- **Fastify API Server**
- **Caddy Reverse Proxy** with automated local HTTPS
- **Daily Database Backup Worker**

### 4. Access the Application
* Open your browser and navigate to:
  **`http://localhost`** or **`https://localhost`**
* Default initial administrator credentials:
  - **Username:** `admin`
  - **Password:** `admin123456`

---

## 💻 Local Development Setup

To run and contribute to the project locally using Node.js:

### Prerequisites:
- **Node.js** >= 20.0.0
- **pnpm** >= 9.0.0 (`npm install -g pnpm`)
- **Docker** (for running PostgreSQL)

### Setup Steps:

1. **Install dependencies:**
   ```bash
   pnpm install
   ```

2. **Configure environment:**
   ```bash
   cp .env.example .env
   ```

3. **Start the PostgreSQL database:**
   ```bash
   docker compose up -d postgres
   ```

4. **Sync database schema and seed standard types:**
   ```bash
   pnpm --filter daftar-server exec prisma db push
   pnpm --filter daftar-server prisma:seed
   ```

5. **Start frontend and backend in watch mode:**
   ```bash
   pnpm dev
   ```
   - Client UI: `http://localhost:5173`
   - API Server: `http://localhost:3000`

---

## 🔒 Security Best Practices

1. **Change Default Credentials:** Change the default `admin` password immediately after initial login from **User Management**.
2. **Enable 2FA:** Set up Two-Factor Authentication under **Settings** and securely store the 8 emergency recovery codes.
3. **Environment Isolation:** Ensure `.env` is never committed to source control. Production deployments must specify a unique `JWT_SECRET` and `MASTER_ENCRYPTION_KEY`.
4. **Rate Limiting:** Authentication routes are rate-limited to 10 requests per minute per IP to prevent dictionary and credential stuffing attacks.

---

## 📦 Disaster Recovery & Backups

Daftar provides two backup tiers:
1. **Application JSON Bundle:** Exported by administrators from **Settings > Backup & Restore** for cross-instance migration.
2. **PostgreSQL Binary Dumps:** Daily automated `.sql.gz` database dumps saved to the `backups/` volume.

To restore a database dump:
```bash
gunzip < backups/daftar_backup_YYYYMMDD_HHMMSS.sql.gz | docker exec -i daftar_postgres psql -U daftar_user -d daftar_db
```

---

## 📚 Technical Documentation

In-depth technical architecture and schema specifications are available in the [`docs/`](./docs/) directory:

- [01. Architecture & Stack](./docs/01-architecture-and-stack.md)
- [02. Data Model & Schema](./docs/02-data-model-and-schema.md)
- [03. Security & Cryptography](./docs/03-security-and-encryption.md)
- [04. UI/UX & Design Guidelines](./docs/04-ui-ux-and-components.md)
- [05. Core Features Specification](./docs/05-core-features-spec.md)
- [06. Deployment & Operations](./docs/06-deployment-and-operations.md)

---

## 📜 License

This project is licensed under the [MIT License](LICENSE).
