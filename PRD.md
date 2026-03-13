# Wuolah of Romania — Product Requirements Document

## Overview

Romania's first monetized, peer-to-peer study document sharing platform for university students. Students upload study materials (lecture notes, exam papers, seminar docs) and earn **RON** for every unique download. Downloads are **free** for consumers — revenue comes from a **5-second ad interstitial** shown before each download.

## Tech Stack

| Layer       | Technology                              |
| ----------- | --------------------------------------- |
| Frontend    | Next.js 14+ (App Router), Tailwind CSS  |
| Auth        | Supabase Auth (email + Google OAuth)    |
| Database    | Supabase Postgres                       |
| Storage     | Supabase Storage (PDF bucket)           |
| Ads         | Google AdSense / custom interstitial    |
| Payments    | Manual IBAN / Revolut payouts (MVP)     |

---

## Core Loop 1 — Backpack Onboarding

**Goal:** Every user configures their academic context so the platform can surface relevant documents.

### Flow

1. User signs up / logs in.
2. First-time users are redirected to the Backpack setup screen.
3. Hierarchical selection:
   - **Universitate** (e.g., Universitatea din București)
   - **Facultate** (e.g., Facultatea de Matematică și Informatică)
   - **Specializare** (e.g., Informatică)
   - **Anul de studiu** (1–6)
4. Selection is persisted to `user_profiles` and determines the default document feed.
5. Users can update their backpack at any time from Settings.

### Data

- Lookup tables: `universities`, `faculties`, `specializations` (seeded, admin-managed).
- `user_profiles` stores the selected `university_id`, `faculty_id`, `specialization_id`, `year`.

---

## Core Loop 2 — Uploading

**Goal:** Top students share their study materials and build a passive income stream.

### Flow

1. Authenticated user navigates to "Încarcă Document".
2. Fills in metadata:
   - **Titlu** (title)
   - **Profesor** (professor name)
   - **Tip document** (enum: `curs`, `seminar`, `laborator`, `examen`, `fisa`, `altele`)
3. Selects or confirms the target Facultate / Specializare / An.
4. Uploads a PDF file (max 50 MB).
5. Backend stores file in Supabase Storage, creates a `documents` row with status `PROCESSING`.
6. (Future) Automated checks (virus scan, duplicate SHA-256 hash) flip status to `ACTIVE` or `REJECTED`.
7. For MVP, status goes straight to `ACTIVE`.

### Validation Rules

- File type: PDF only.
- Max size: 50 MB.
- Required fields: title, professor, doc_type.
- One upload creates one document row; no batch uploads in MVP.

---

## Core Loop 3 — Downloading & Revenue

**Goal:** Students get free study materials; uploaders earn money.

### Flow

1. User browses / searches documents filtered by their backpack context.
2. Clicks "Descarcă" on a document.
3. A **5-second ad interstitial** is displayed (cannot be skipped).
4. After the ad completes, the client calls the download API.
5. Backend checks uniqueness: **same user + same document within the last 24 hours = no credit**.
6. If unique:
   - Insert row into `downloads`.
   - Credit uploader's wallet: **+0.05 RON**.
   - Increment `documents.download_count`.
7. Return a signed URL for the PDF.

### Revenue Model

| Event             | Amount     |
| ----------------- | ---------- |
| Unique download   | +0.05 RON  |
| Duplicate (< 24h) | +0.00 RON  |

### Anti-Abuse

- Rate limit: max 100 downloads per user per day.
- Ad verification token sent from client, validated server-side.
- Downloading your own documents does not generate revenue.

---

## Core Loop 4 — Wallet & Withdrawals

**Goal:** Uploaders cash out their earnings.

### Flow

1. User views wallet balance on their profile / dashboard.
2. Balance accumulates from download credits.
3. **Withdrawal unlocks at ≥ 50 RON**.
4. User submits a withdrawal request:
   - **Method:** IBAN bank transfer or Revolut tag.
   - **Amount:** min 50 RON, max current balance.
5. Request enters `PENDING` status.
6. Admin reviews and processes payout manually (MVP).
7. Status transitions: `PENDING` → `APPROVED` → `COMPLETED` or `REJECTED`.

### Data

- `wallets` table: `user_id`, `balance` (decimal).
- `withdrawal_requests` table: `user_id`, `amount`, `method`, `iban_or_revolut`, `status`, timestamps.

---

## Data Model Summary

```
users (Supabase auth.users)
  └── user_profiles (1:1)
        ├── university_id → universities
        ├── faculty_id   → faculties
        ├── specialization_id → specializations
        └── year

universities
  └── faculties (1:N)
        └── specializations (1:N)

documents
  ├── uploader_id → auth.users
  ├── faculty_id → faculties
  ├── specialization_id → specializations
  ├── year
  └── file_url (Supabase Storage)

downloads
  ├── user_id → auth.users
  └── document_id → documents

wallets
  └── user_id → auth.users (1:1)

withdrawal_requests
  └── user_id → auth.users
```

---

## Non-Functional Requirements

- **Security:** RLS on every table. Users can only read/write their own profiles, wallets, and withdrawal requests. Documents are publicly readable when `ACTIVE`.
- **Performance:** Indexes on `downloads(user_id, document_id, created_at)` for fast 24h uniqueness checks.
- **Scalability:** Supabase handles connection pooling; Next.js edge functions for download API.
- **Localization:** All UI text in Romanian.
- **Mobile:** Responsive-first design (most Romanian students browse on mobile).
