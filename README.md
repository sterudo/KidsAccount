Here is a highly tailored, comprehensive, and professional `README.md` for your project, explicitly incorporating your unique stack, the specific feature list you provided, and your **Google Apps Script / Sheets** backend architecture.

---

# 👦 KidsAccount: The Allowance Vault 💰

**KidsAccount** is an advanced, offline-first Progressive Web Application (PWA) designed to manage pocket money, automated allowances, and micro-savings within a family ecosystem. This ledger system utilizes a unique "Serverless Sheets" architecture, leveraging Google Sheets and Google Drive as its database and cloud infrastructure, combined with client-side AI capabilities.

The codebase was engineered using **AI-assisted development (Gemini 2.5/3.1 Flash series)**.

---

## 🚀 Key Features

### 📡 PWA & Core Capabilities

* **Offline-First Resilience:** Fully functional offline mode. Transactions are queued in a local `pendingQueue` and automatically synced via background tasks when internet access returns.
* **Camera Integration:** Snap and attach receipts or transaction documents directly from your device.
* **Smart Voice Commands:** Dictate full transactions via local speech recognition.

### 🤖 Gemini AI Automations

* **Visual Receipt Parsing:** Images attached to transactions are parsed by an AI model to automatically extract prices, quantities, and generate descriptions.
* **Semantic Geo-Location:** Device coordinates and context are translated using AI to determine accurate, human-readable semantic locations for ledger records.

### 🛡️ Device & Identity Security

* **Device Whitelisting:** Strict device-level fingerprint authorization prevents unauthorized hardware from querying data or syncing.
* **Role-Based Access Control (RBAC):** Three operational tiers:
* 👑 **Super:** Access to system configurations, raw schema alterations, and core administrative workflows.
* 🛡️ **Admin:** Password-protected user management, ledger edits, and child settings overrides.
* 👤 **User:** Standard view, profile tracking, and limited transaction initiation.



### 👦 Account & Family Optimization

* **Profile Customization:** Crop avatars, assign distinct component UI color accents, and personalize cards for every child.
* **Automated Wealth Engines:** * Schedule recurring allowance frequencies at fully custom intervals.
* Configure custom compounding interest rates applied automatically to individual savings pools over time.



### 💸 Ledger Ecosystem

* **Comprehensive Cashflows:** Record straightforward Deposits, Withdrawals, and direct **Child-to-Child Transfers** with balance preservation.
* **Data Lifecycle Insurance:** Export entire structural schemas locally as flat JSON objects, or trigger cloud snapshots securely into Google Drive.

---

## 🛠️ Architecture & Tech Stack

```
[ Frontend: Vue.js 3 / PWA ] 
         │ 
         ├── (Offline) ──> [ LocalStorage Cache & Outbox Queue ]
         │
         └── (Online)  ──> [ Service Worker: StaleWhileRevalidate ]
                                 │
                                 ▼
                     [ Google Apps Script (Web App) ]
                                 │
                   ┌─────────────┴─────────────┐
                   ▼                           ▼
          [ Google Sheets ]             [ Google Drive ]
          (Ledgers & Schema)          (Avatars & Backups)

```

* **Frontend Framework:** Vue.js 3 (Composition API / Script Setup)
* **PWA & Caching Engine:** Vite PWA Plugin using `StaleWhileRevalidate` (API calls) and `CacheFirst` (Avatars/Assets) strategies.
* **AI Orchestration:** Google Gemini Pro / Flash SDK (Client and Server runtime hooks).
* **Database & File Store:** Google Sheets API via Google Apps Script Web App endpoints (`doGet` & `doPost`), combined with Google Drive image blobbing.

---

## 💾 Project Installation

### Prerequisites

* **Node.js** (v18+ recommended)
* A Google Account to host the database infrastructure.

### 1. Google Apps Script Configuration

1. Create a new Google Sheet named `KidsAccount_DB`.
2. Generate sheets named: `transactions`, `authorized_devices`, `users`, and `children`.
3. Select **Extensions > Apps Script** and deploy your server hooks (`Code.gs`) implementing your `action` handlers (`requestAuth`, `getPendingAuth`, `approveAuth`, `verifyPassword`, etc.).
4. Click **Deploy > New Deployment**, set access to **"Anyone"**, and copy your deployment Web App URL.

### 2. Frontend Local Installation

Clone the repository and jump into the terminal:

```bash
# Install NPM dependencies
npm install

# Create environment variable configuration
echo "VITE_SHEET_API_URL=your_google_apps_script_url_here" > .env.local

# Run the local Vite dev server
npm run dev

```

### 3. Compilation & Deployment

To export optimized statutory asset layers directly for static distribution engines (like GitHub Pages or Netlify):

```bash
# Build the production PWA asset layer
npm run build

# Run unit tests
npm run test

```

---

## 📱 Synchronization & Offline Lifecycles

When working offline, transactions generate an internal runtime mock state immediately:

1. An optimistic row is assigned an `id` matching `tx_${timestampId}` with `isPendingSync: true`.
2. The payload is written to `localStorage` under the application outbox key.
3. Upon catching the native DOM browser `online` window event, the application processes the queue sequentially (`shift()`), checking for unique transaction hashes on the server to guarantee perfect synchronization.

---

## ⚖️ License

This project is private and tailored for personal/family tracking administration. All rights reserved.