# 🚀 Document 06: Deployment, Maintenance & Operations

---

## 1. Docker Compose Architecture

All components of the **Daftar** platform are containerized and orchestrated via `docker-compose.yml`. The system operates completely offline without external internet dependencies during runtime.

```yaml
version: '3.8'

services:
  # Reverse proxy with automatic internal TLS
  caddy:
    image: caddy:2-alpine
    container_name: daftar_caddy
    restart: always
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./docker/Caddyfile:/etc/caddy/Caddyfile:ro
      - caddy_data:/data
      - caddy_config:/config
      - client_dist:/usr/share/caddy:ro
    depends_on:
      - server

  # Fastify API backend server
  server:
    build:
      context: ./server
      dockerfile: ../docker/Dockerfile.server
    container_name: daftar_server
    restart: always
    environment:
      - NODE_ENV=production
      - PORT=3000
      - DATABASE_URL=postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB}?schema=public
      - MASTER_ENCRYPTION_KEY=${MASTER_ENCRYPTION_KEY}
      - JWT_SECRET=${JWT_SECRET}
      - UPLOAD_DIR=/app/uploads
    volumes:
      - uploads_data:/app/uploads
    depends_on:
      postgres:
        condition: service_healthy

  # Primary PostgreSQL 16 database
  postgres:
    image: postgres:16-alpine
    container_name: daftar_postgres
    restart: always
    environment:
      - POSTGRES_USER=${POSTGRES_USER}
      - POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
      - POSTGRES_DB=${POSTGRES_DB}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER} -d ${POSTGRES_DB}"]
      interval: 5s
      timeout: 5s
      retries: 5

  # Automated daily database backup runner
  backup:
    image: postgres:16-alpine
    container_name: daftar_backup
    restart: always
    volumes:
      - ./docker/backup.sh:/backup.sh:ro
      - backups_data:/backups
    environment:
      - POSTGRES_HOST=postgres
      - POSTGRES_USER=${POSTGRES_USER}
      - POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
      - POSTGRES_DB=${POSTGRES_DB}
    entrypoint: ["/bin/sh", "/backup.sh"]
    depends_on:
      - postgres

volumes:
  postgres_data:
  uploads_data:
  backups_data:
  caddy_data:
  caddy_config:
  client_dist:
```

---

## 2. Environment Variables & Master Key (`.env.example`)

Before launching the stack, configure the `.env` file in the project root:

```env
# Database Credentials
POSTGRES_USER=daftar_admin
POSTGRES_PASSWORD=strong_postgres_password_here
POSTGRES_DB=daftar_db

# User Session Security
JWT_SECRET=super_secret_jwt_key_at_least_32_characters_long

# AES-256 Symmetric Master Encryption Key (Exactly 64 hexadecimal characters = 32 bytes)
# Generate via: openssl rand -hex 32
MASTER_ENCRYPTION_KEY=0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef

# Maximum Upload File Size in Bytes (50 MB)
MAX_FILE_SIZE_BYTES=52428800
```

> [!CAUTION]
> **Critical Warning Regarding `MASTER_ENCRYPTION_KEY`:**
> If this key is lost or overwritten, all encrypted secrets (passwords, tokens, private keys) in the database become permanently unrecoverable. Securely store an offline backup copy of this key.

---

## 3. Reverse Proxy Configuration (`docker/Caddyfile`)

Caddy handles automatic internal HTTPS and reverse proxies API traffic:

```caddy
:443 {
    tls internal

    # React SPA static bundle
    root * /usr/share/caddy
    file_server
    try_files {path} /index.html

    # Backend API proxy
    handle /api/* {
        reverse_proxy server:3000
    }

    # Security headers
    header {
        X-Frame-Options "DENY"
        X-Content-Type-Options "nosniff"
        Referrer-Policy "strict-origin-when-cross-origin"
    }
}
```

---

## 4. Disaster Recovery & Backups

### 4.1. Automated Daily Backups (`docker/backup.sh`)
The backup container runs every 24 hours, generating compressed `pg_dump` archives and maintaining a rolling 30-day retention cycle:
```bash
#!/bin/sh
while true; do
  DATE=$(date +%Y%m%d_%H%M%S)
  FILE="/backups/daftar_backup_${DATE}.sql.gz"
  echo "[$(date)] Starting automated backup..."
  PGPASSWORD=$POSTGRES_PASSWORD pg_dump -h $POSTGRES_HOST -U $POSTGRES_USER $POSTGRES_DB | gzip > $FILE
  echo "[$(date)] Backup successfully saved to $FILE."
  
  # Prune backups older than 30 days
  find /backups -name "daftar_backup_*.sql.gz" -mtime +30 -delete
  
  # Sleep for 24 hours
  sleep 86400
done
```

### 4.2. Restoring a Database Dump:
```bash
gunzip < /backups/daftar_backup_YYYYMMDD_HHMMSS.sql.gz | docker exec -i daftar_postgres psql -U daftar_admin -d daftar_db
```

---

## 5. Security Hardening Checklist

- [ ] Rotate default PostgreSQL credentials and generate a unique 64-char hex `MASTER_ENCRYPTION_KEY`.
- [ ] Ensure database port 5432 is not exposed to the public internet or external interfaces.
- [ ] Verify HTTPS connectivity and accept the internal certificate authority in client browsers.
- [ ] Maintain an encrypted offline backup of the production `.env` configuration file.
