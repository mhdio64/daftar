# 🎨 UI/UX Design Master Specification
> **Project:** Daftar — Enterprise IT Asset Vault, Secrets Manager & Operational Runbooks  
> **Master Document Path:** [`docs/design.md`](./docs/design.md)  
> **Status:** Final Reviewed Specification (Refined based on ergonomic and security evaluations)  
> **Language & Layout:** Bi-directional Support (RTL/LTR) with LTR Monospace Typography for Technical Data

---

## 1. Design Philosophy & Core Axioms

The user interface of **Daftar** is built upon three foundational pillars:

1. **Density without Clutter:** Inspired by the raw information density of Excel combined with the clean minimalism of modern tools like Linear and Notion. Enterprise operations require seeing maximal operational data at a glance without unnecessary pagination or excessive white space.
2. **The 2-Click Rule:** During outages and high-pressure incident response, any critical technical attribute (IP address, root username, SSH port, or password) must be discoverable and copied in under 3 seconds with at most 2 clicks.
3. **Zero-Friction Security:** Security safeguards (credential masking, automatic concealment timers, and audit logging) must never hinder the daily velocity of DevOps and systems engineers.

---

## 2. Design System & Visual Tokens

### 2.1. Color Palette with WCAG AAA Contrast
The application defaults to an ergonomic **Deep Slate Dark** theme designed to minimize eye fatigue during extended on-call shifts, with instantaneous toggle capability to Light mode:

```css
/* Dark Mode Tokens */
--bg-canvas: #0B0F19;         /* Main application canvas */
--bg-surface-1: #111827;      /* Cards, sidebar, and table container surfaces */
--bg-surface-2: #1F2937;      /* Hover states and elevated cards */
--bg-surface-elevated: #374151; /* Dropdowns, popovers, and modal dialogs */
--border-subtle: #1F2937;     /* Soft separators */
--border-strong: #374151;     /* Input fields and table borders */

/* Brand & Interactive Colors */
--primary-500: #6366F1;       /* Primary action buttons & focus rings (Indigo) */
--primary-600: #4F46E5;       /* Hover state on primary actions */
--primary-glow: rgba(99, 102, 241, 0.15); /* Focus aura */

/* Status & Expiry Badges */
--status-critical: #EF4444;   /* Red: Expired or security alert */
--status-warning-high: #F59E0B;/* Orange: Expiry due within 7 days */
--status-warning-mid: #EAB308; /* Yellow: Expiry due within 30 days */
--status-success: #10B981;    /* Emerald: Active, healthy, copied successfully */
```

### 2.2. Typography & Bidirectional Rules
* **UI Typography:** The **Vazirmatn** font family across 300 (Light), 400 (Regular), 500 (Medium), and 700 (Bold) weights for clear bilingual legibility.
* **Technical Monospace Typography:** **`JetBrains Mono`** for all IP addresses, ports, credentials, file paths, and hashes:
  * Strict Left-to-Right (`dir="ltr"`) rendering.
  * Tabular numeric alignment (`font-variant-numeric: tabular-nums`) to ensure figures line up perfectly across vertical table rows.
  * Prevention of punctuation and colon inversions in network addresses (e.g. `192.168.1.1:8080`).

---

## 3. Layout Architecture

The interface provides a synchronized, three-pane workspace:

```plaintext
+---------------------------------------------------------------------------------------------------------+
| [🗂️ Daftar]  [🔍 Global Search... (Ctrl+K)]                  [⏰ 3 Expirations]  [☀️/🌙]  [👤 SysAdmin ▼] |
+-----------------------+---------------------------------------------------------------------------------+
|  Categories Sidebar   | Breadcrumb: [Assets] / [Virtual Servers (VPS)]          Density: [ Compact | Normal ]|
|                       +---------------------------------------------------------------------------------+
| ➕ New Category       | [➕ Add Asset] [📖 Category Wiki] [⚙️ Schema] [📥 Import] [📤 Export Excel]     |
| --------------------- |---------------------------------------------------------------------------------|
| 📁 Infrastructure     | Quick Filter: [ All (24) ] [ 🔴 Expired (2) ] [ 🟠 Upcoming (3) ] [ 🔍 Filter ] |
|  🖥️ VPS Servers [12]  |---------------------------------------------------------------------------------|
|  🌐 Domains [6]       | [ ] | Asset Name       | IP Address / Port| OS         | Root Password   | Expiry   |
|  🔑 Licenses [8]      |---------------------------------------------------------------------------------|
| 📁 SaaS & Subscriptions| [ ] | Primary Database | 10.0.1.5:5432 📋 | Ubuntu     | •••••••• 👁️ 📋  | 2026/05/15|
|  ✉️ Corporate Mail    | [ ] | Tehran LB        | 192.168.1.10  📋 | Debian     | •••••••• 👁️ 📋  | 2026/03/20|
|                       | [ ] | Germany Backup   | 89.144.20.12  📋 | Rocky      | •••••••• 👁️ 📋  | In 7 days|
| --------------------- +---------------------------------------------------------------------------------+
| ⏰ Expiry Center      | Showing 1 to 3 of 24 assets | Active Columns: 5 of 8 ▼ | [◀ Prev] [1] 2 3 [Next ▶] |
| 📜 Audit Trail        +---------------------------------------------------------------------------------+
| 👥 User Management    | Detail Drawer (Opens smoothly from screen edge on row click):                   |
| ⚙️ Global Settings    | [Properties] | [📖 Runbook & Config] | [📎 Attachments (3)] | [🕒 Audit Log]     |
+-----------------------+---------------------------------------------------------------------------------+
```

---

## 4. Advanced Data Grid UX

The data grid serves as the core operational canvas and incorporates the following ergonomic design choices:

### 4.1. Density Toggle
* **Compact Mode (Default for DevOps):**
  * Row height: `36px`.
  * Font size: `12.5px`.
  * Displays up to 25 rows simultaneously without scrolling on 1080p monitors.
* **Comfortable Mode:**
  * Row height: `48px`.
  * Font size: `14px` with relaxed padding, optimal for touchscreens and tablet audits.

### 4.2. Click Conflict Resolution
* All interactive cell elements (copy buttons, reveal eye toggles, hyperlinks, checkboxes) use `e.stopPropagation()` to prevent unwanted drawer triggers.
* The cursor displays as `copy` over copy targets and `pointer` over general row surfaces.
* A dedicated action column provides a clear link arrow (↗️) for opening the detail drawer.

### 4.3. Sticky Columns & Visibility Management
* Multi-select checkboxes and the Asset Name column remain pinned during horizontal scrolling across wide custom schemas.
* Column visibility preferences persist automatically in client `localStorage`.

### 4.4. Bulk Actions Floating Toolbar
Selecting one or more rows summons a floating action bar at the screen bottom:
* Selected count indicator (e.g. *"5 items selected"*).
* Export selected items to Excel.
* Batch delete with two-step confirmation.
* Batch assign category or tags.

---

## 5. Visual Security & Clipboard Ergonomics

### 5.1. 1-Click Copy Lifecycle (Micro-Interaction)
1. **Idle State:** Soft muted copy icon beside technical values (`opacity-40`).
2. **Hover State:** Highlighted icon with an instant tooltip *"Copy to clipboard"*.
3. **Click State:** 
   * Icon transitions to an emerald checkmark (✅).
   * Tooltip updates to green *"Copied!"* for 1.5 seconds.
   * Zero screen jitter or disruption.

### 5.2. Shoulder Surfing Protection
* Passwords render by default as masked bullets `••••••••`.
* **Direct Blind Copy:** Users can click the copy icon directly beside a masked password. The credential is decrypted in memory and copied to the clipboard without ever exposing plaintext characters on the monitor.
* **Conditional Reveal with Auto-Mask Timer:**
  * Clicking the eye icon (👁️) reveals the credential.
  * A subtle countdown indicator begins a **30-second timer**.
  * After 30 seconds (or immediately upon tab blur/window defocus), the field automatically reverts to masked bullets.

### 5.3. Graceful Clipboard Fallback
If the browser restricts clipboard write permissions:
* A modal immediately appears with the decrypted secret pre-selected, prompting *"Press Ctrl+C to copy"*.

---

## 6. Slide-Over Detail Drawer

Clicking a row opens the slide-over drawer containing:
1. **Properties:** Comprehensive form for updating dynamic and encrypted attributes with inline validation and an integrated secure password generator.
2. **Runbook & Documentation (Embedded Markdown):**
   * **Preview Mode:** Markdown rendering with syntax highlighting and 1-click code block copying.
   * **Edit Mode:** Distraction-free markdown editor with standard keyboard shortcuts (`Ctrl+B`, `Ctrl+K`).
3. **Attachments:** Drag-and-drop zone supporting config files, VPN profiles, and certificates up to 50MB.
4. **Audit Timeline:** Historical chronological log of changes and secret unmask events for the asset.
5. **Renewal Records:** Past renewal expenses, invoices, and payment receipts.

---

## 7. Command Palette & Global Search (`Ctrl + K`)

Pressing `Ctrl + K` or `Cmd + K` opens the centralized command palette:

```plaintext
+-----------------------------------------------------------------------------+
|  🔍 Main server...                                            [ Esc to exit ]|
+-----------------------------------------------------------------------------+
| Matching Assets:                                                            |
|  🖥️ [VPS] Tehran Datacenter Main DB                        192.168.10.15 📋  |
|      ↳ OS: Ubuntu 24.04  | Renewal: 2026/05/15                              |
|  🖥️ [VPS] Auth Gateway Node                                10.0.1.20     📋  |
|                                                                             |
| Matching Documentation & Runbooks:                                          |
|  📖 Tehran Server Firewall Setup Runbook                                    |
|      ↳ "...allow incoming port 5432 using ufw allow command..."             |
|                                                                             |
| Quick Commands:                                                             |
|  ➕ Add new server in VPS category                                           |
|  ⏰ View this week's renewals (3 items)                                      |
+-----------------------------------------------------------------------------+
| ⇅ Navigate  |  ↵ Open Detail Drawer  |  Tab Copy IP Address                 |
+-----------------------------------------------------------------------------+
```

---

## 8. Expiration Radar & Calendar UX

1. **Datepicker:** Built-in support for both Solar Hijri (Jalali) and Gregorian calendars with quick-jump shortcuts (+1 Month, +3 Months, +1 Year).
2. **Header Expiry Radar:** Bell badge highlights upcoming expirations. Clicking opens an urgency breakdown (Today, This Week, This Month).
3. **Log Renewal Modal:** Clean 1-click renewal dialog with localized formatted currency separators (`15,000,000`).

---

## 9. Edge States & System Resilience

* **Polished Empty States:** Categories without records display an illustrative call-to-action button (*"Create First Asset"* or *"Import from Excel"*).
* **Skeleton Shimmer Loading:** Smooth skeleton placeholders simulate the grid layout during data fetching to maintain perceived performance.
* **Smart Text Truncation:** Long values truncate with ellipses (`...`) while presenting the complete text in a smart hover tooltip.
