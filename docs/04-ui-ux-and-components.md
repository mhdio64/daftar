# 🎨 Document 04: UI/UX & Component Guidelines

---

## 1. Design System Principles

The user interface of **Daftar** is built with a modern, dense, and data-driven approach inspired by tools like Linear and Notion, tailored for enterprise IT and DevOps workflows.

### 1.1. Typography & Bidirectional Standards
- **Page Layout:** Native RTL support with full LTR technical data embedding.
- **Typography:** **Vazirmatn** font family in multiple weights (Light, Regular, Medium, Bold) for UI elements, labels, and documentation.
- **Technical Data Presentation:**
  * Hostnames, descriptions, and category labels render naturally in Persian/English text direction.
  * IP addresses, port numbers, hash strings, and credentials always render with strict **LTR** direction and monospace typography (`JetBrains Mono` or `Consolas`) to prevent confusing punctuation and dot reordering.

### 1.2. Color Palette
- **Primary Accent:** Deep Indigo (`Indigo 600` / `#4F46E5`) for primary actions, focus rings, and active states.
- **Renewal Status Badges:**
  * 🔴 **Critical / Expired:** Rose (`Rose 600`)
  * 🟠 **Urgent Warning (< 7 days):** Amber (`Amber 600`)
  * 🟡 **Approaching Expiry (< 30 days):** Yellow (`Yellow 600`)
  * 🟢 **Normal / Healthy:** Emerald (`Emerald 600`)
- **Neutral Canvas:** High-contrast Slate palette with seamless Dark/Light mode switching.

---

## 2. Layout Architecture

The application layout is structured into three primary synchronized zones:

```plaintext
+---------------------------------------------------------------------------------------------+
|                                      Top Navigation Bar                                     |
| [🔍 Global Search (Ctrl + K)]                   [🔔 Expiration Radar]    [👤 User: Admin]   |
+------------------+--------------------------------------------------------------------------+
|  Main Sidebar    | Category Toolbar: [➕ New Asset] [📖 Category Wiki] [⚙️ Schema] [📤 Excel] |
|                  +--------------------------------------------------------------------------+
|  🗂️ Daftar       | Advanced Data Grid View:                                                 |
|                  | +----+-----------------+----------------+--------------+------------------+ |
|  🖥️ VPS Servers  | | ID | Asset Title     | IP Address/Port| Username     | Password         | |
|  ✉️ Mailboxes    | +----+-----------------+----------------+--------------+------------------+ |
|  🌐 Domains      | | 1  | Tehran Main DB  | 192.168.10.15  | root 📋      | •••••••• 👁️ 📋   | |
|  🔑 Licenses     | | 2  | Frankfurt Node  | 10.0.8.20:8080 | deploy 📋    | •••••••• 👁️ 📋   | |
|  ➕ New Category | +----+-----------------+----------------+--------------+------------------+ |
|  ----------------|                                                                          |
|  ⏰ Renewals (3) |  [ ◀ Previous ]              [ Page 1 of 12 ]               [ Next ▶ ]     |
|  📜 Audit Logs   |                                                                          |
|  👥 Users & RBAC |                                                                          |
+------------------+--------------------------------------------------------------------------+
```

---

## 3. Core Components

### 3.1. Advanced Data Grid Component
- **Sticky Header & First Column:** Keeps table column headers and asset titles visible during horizontal and vertical scrolling.
- **1-Click Copy:** Technical values (IP addresses, usernames, passwords) feature an inline copy button with immediate visual feedback (green checkmark and *"Copied!"* toast).
- **Column Visibility Picker:** Users can customize and persist which columns appear in the grid using local storage.
- **Smart Password Masking:** Secrets render as bullets (`••••••••`). The eye icon unmasks the credential with a 30-second countdown, while the copy icon copies the plaintext directly without displaying it on screen.

### 3.2. Slide-over Detail Drawer
Clicking any table row opens a smooth slide-over drawer from the screen margin, containing:
1. **Properties:** Comprehensive form for viewing and editing all dynamic and encrypted fields with inline validation.
2. **Technical Runbook (Markdown Editor & Preview):** Asset-specific operational documentation, firewall rules, and deployment instructions.
3. **Attachments Dropzone:** Drag-and-drop file uploader supporting `.conf`, `.ovpn`, `.key`, `.pdf`, and `.png` files up to 50MB.
4. **Audit History:** Per-asset timeline tracking who updated the record or unmasked secrets.
5. **Renewal Log:** Expiration tracking, payment history, and renewal cost records.

### 3.3. Category Wiki Tab
In addition to individual asset notes, every category includes a shared **"Category Wiki"** tab. Technical leads can document global server hardening standards, naming conventions, or VPN procedures accessible by the entire team.

### 3.4. Global Keyboard Shortcuts
- `Ctrl + K` / `Cmd + K`: Open the global search and command palette.
- `Esc`: Close drawers, modals, or active search overlays.
- `Alt + N`: Quick-open the asset creation modal for the active category.
