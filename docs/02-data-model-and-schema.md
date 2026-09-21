# 🗄️ Document 02: Data Model & Database Schema

---

## 1. Entity Relationship (ER) Diagram

Daftar is backed by PostgreSQL, employing a hybrid data architecture combining structured relational tables with flexible schemaless `JSONB` columns for user-defined attributes.

```mermaid
erDiagram
    User ||--o{ Asset : "creates / updates"
    User ||--o{ AuditLog : "triggers events"
    User ||--o{ RenewalLog : "records renewals"
    User ||--o{ Attachment : "uploads"
    
    AssetType ||--o{ Asset : "defines instances of"
    AssetType ||--o{ Attachment : "category-level attachments"
    
    Asset ||--o{ Attachment : "record-level attachments"
    Asset ||--o{ RenewalLog : "renewal history"
    
    User {
        string id PK
        string username UK
        string fullName
        string passwordHash
        enum role "ADMIN | EDITOR | VIEWER"
        jsonb categoryPermissions "Array of permitted asset type IDs"
        boolean isActive
        string totpSecret "Encrypted TOTP Secret (AES-256)"
        boolean totpEnabled
        jsonb recoveryCodes "Hashed recovery codes (SHA-256)"
        datetime createdAt
        datetime updatedAt
    }

    AssetType {
        string id PK
        string name "Display name"
        string slug UK "Unique URL-friendly slug"
        string icon "Lucide icon identifier"
        string description
        jsonb schemaDefinition "Array of custom field definitions"
        text typeDocsMarkdown "Category-wide operational runbook"
        int displayOrder
        datetime createdAt
        datetime updatedAt
    }

    Asset {
        string id PK
        string assetTypeId FK
        string title "Asset title (e.g. Primary Tehran DB Server)"
        string assetCode "Unique physical asset tag identifier"
        jsonb values "Unencrypted custom field values"
        jsonb encryptedValues "AES-256-GCM encrypted secrets"
        datetime expiryDate "Expiration / renewal due date"
        text docsMarkdown "Asset-specific technical documentation"
        string createdById FK
        string updatedById FK
        datetime createdAt
        datetime updatedAt
    }

    Attachment {
        string id PK
        string assetTypeId FK "Optional: category attachment"
        string assetId FK "Optional: asset-specific attachment"
        string originalName "Original uploaded file name"
        string storagePath "Path on disk / volume"
        string mimeType
        int sizeBytes
        string uploadedById FK
        datetime createdAt
    }

    AuditLog {
        string id PK
        string userId FK
        string action "CREATE | UPDATE | DELETE | READ_SECRET"
        string targetEntity "Asset | AssetType | User"
        string targetId
        jsonb diff "Old vs. new value differential"
        string ipAddress
        datetime createdAt
    }

    RenewalLog {
        string id PK
        string assetId FK
        datetime previousExpiryDate
        datetime newExpiryDate
        bigint cost "Renewal cost in currency units"
        string note "Invoice number and payment notes"
        string renewedById FK
        datetime renewedAt
    }
```

---

## 2. Dynamic Field Definition (`schemaDefinition`)

A core capability of Daftar is allowing administrators to define custom field structures for any asset type without running database migrations. These definitions are stored in the `schemaDefinition` column of `AssetType` as a JSON array.

### 2.1. TypeScript Interface for Dynamic Fields
```typescript
export type FieldType = 
  | 'text'          // Single-line text (hostname, domain name, username)
  | 'email'         // Email address with mailto action
  | 'textarea'      // Multi-line descriptions and notes
  | 'secret'        // Encrypted credentials, API tokens, private keys
  | 'ip_port'       // IP address with optional port (e.g. 192.168.1.10:22)
  | 'url'           // Web URL with direct navigation link
  | 'jalali_date'   // Solar/Gregorian date with expiration alerting
  | 'select';       // Single-select dropdown from predefined options

export interface FieldDefinition {
  id: string;              // Unique schema identifier (e.g. "f_ip_addr")
  name: string;            // Key stored in JSONB columns (e.g. "server_ip")
  label: string;           // Display label (e.g. "IP Address")
  type: FieldType;         // Data type
  isRequired: boolean;     // Mandatory validation flag
  placeholder?: string;    // Input placeholder text
  options?: string[];      // Predefined options for select type
  isSecret?: boolean;      // Stored in encryptedValues vs. values
  showInTable: boolean;    // Default visibility in the Excel grid view
  order: number;           // Display order in forms and grid
}
```

### 2.2. Production Example: "Virtual Private Server (VPS)" Schema
```json
[
  {
    "id": "f_1",
    "name": "ip_address",
    "label": "IP Address",
    "type": "ip_port",
    "isRequired": true,
    "showInTable": true,
    "order": 1
  },
  {
    "id": "f_2",
    "name": "ssh_port",
    "label": "SSH Port",
    "type": "text",
    "isRequired": false,
    "showInTable": true,
    "order": 2
  },
  {
    "id": "f_3",
    "name": "root_user",
    "label": "Username",
    "type": "text",
    "isRequired": true,
    "showInTable": true,
    "order": 3
  },
  {
    "id": "f_4",
    "name": "root_password",
    "label": "Root Password",
    "type": "secret",
    "isRequired": true,
    "isSecret": true,
    "showInTable": true,
    "order": 4
  },
  {
    "id": "f_5",
    "name": "os_type",
    "label": "Operating System",
    "type": "select",
    "options": ["Ubuntu 22.04", "Ubuntu 24.04", "Debian 12", "Windows Server 2022", "Rocky Linux 9"],
    "isRequired": false,
    "showInTable": true,
    "order": 5
  },
  {
    "id": "f_6",
    "name": "expiry_date",
    "label": "Renewal Expiry Date",
    "type": "jalali_date",
    "isRequired": false,
    "showInTable": true,
    "order": 6
  }
]
```

---

## 3. Storage Separation: Cleartext vs. Encrypted Values

To ensure strict zero-leakage security while maintaining high-speed indexing:
- **`values (JSONB)` column:** Stores all unencrypted, searchable attributes.
- **`encryptedValues (JSONB)` column:** Stores sensitive secrets encrypted with AES-256-GCM. Each field is serialized as an envelope containing its initialization vector, authentication tag, and ciphertext:

```json
{
  "root_password": {
    "iv": "a1b2c3d4e5f6...",
    "authTag": "9f8e7d6c5b4a...",
    "ciphertext": "8374928374abcdef..."
  }
}
```

---

## 4. Database Indexing Strategy

To guarantee sub-50ms query response times even across large asset inventories:

```sql
-- Foreign keys and high-frequency filter indexes
CREATE INDEX idx_assets_type_id ON "Asset"("assetTypeId");
CREATE INDEX idx_assets_expiry ON "Asset"("expiryDate") WHERE "expiryDate" IS NOT NULL;
CREATE INDEX idx_assets_code ON "Asset"("assetCode");
CREATE INDEX idx_audit_created_at ON "AuditLog"("createdAt" DESC);
CREATE INDEX idx_audit_user_id ON "AuditLog"("userId");

-- Generalized Inverted Index (GIN) on values JSONB for instant custom attribute searches
CREATE INDEX idx_assets_values_gin ON "Asset" USING gin ("values" jsonb_path_ops);

-- Trigram indexing on asset title for fuzzy search
CREATE INDEX idx_assets_title_trgm ON "Asset" USING gin ("title" gin_trgm_ops);
```

---

## 5. Schema Evolution Rules

When an administrator updates an asset type's schema:
1. **Adding a New Field:** The field is appended to `schemaDefinition`. Existing records default to `null` for this attribute without throwing database errors.
2. **Deleting a Field:** The field is removed from `schemaDefinition`. Historical values stored in database rows are preserved (soft deprecation at the UI layer) to prevent irreversible data loss.
3. **Changing Field Types:** A validation warning is displayed. Existing stored values are either safely cast or rendered as raw text.
