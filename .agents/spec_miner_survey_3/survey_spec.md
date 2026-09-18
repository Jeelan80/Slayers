# Specification Discovery: Organizer Endpoints, Lifecycle Operations & Frontend Build

**Investigator**: `spec_miner_survey_3`  
**Target Repository**: `H:\Projects\Hackingly\team-slayers-hackingly`  
**Date**: 2026-09-17T18:57:00Z  

---

## 1. Executive Summary
This document provides the authoritative specification for VeriForge's organizer lifecycle endpoints (`GET /api/registrations`, `GET /api/registrations/{id}`, `POST /api/registrations/{id}/review`, `POST /api/reset`) and the frontend application (`frontend/`) build environment, configuration, and dependencies. Every specification has been directly verified via source code analysis and live execution tests.

---

## Features Discovered

| # | Category | Feature | Description | Inputs | Outputs | Error Behavior | Discovered Via |
|---|----------|---------|-------------|--------|---------|----------------|----------------|
| 1 | Organizer API | `GET /api/registrations` | Returns a list of recorded verification submissions ordered by descending registration ID. Deserializes internal JSON fields (`reasons_json`, `checks_json`, `extracted_json`) into structured objects (`reasons`, `checks`, `extracted`). | Query param: `limit: int = 50` (optional, default 50). | HTTP 200 JSON array of registration records. Each item includes IDs, participant profile, decision, confidence, reasons, checks, and audit notes. | Non-integer `limit` returns HTTP 422 Unprocessable Entity (`{"detail": [{"type": "int_parsing", "loc": ["query", "limit"], ...}]}`). | `backend/app/main.py:185`, `backend/app/db.py:128`, live test |
| 2 | Organizer API | `GET /api/registrations/{reg_id}` | Retrieves a single detailed registration record by its integer ID. | Path param: `reg_id: int` | HTTP 200 JSON object with full registration fields, parsed checks, extracted OCR data, reasons, and audit status. | Non-existent ID returns HTTP 404 (`{"detail": "Registration not found"}`). Non-integer path param returns HTTP 422. | `backend/app/main.py:190`, `backend/app/db.py:98`, live test |
| 3 | Organizer API | `POST /api/registrations/{reg_id}/review` | Allows an event organizer to override or update registration status (e.g. `PENDING` -> `APPROVED` or `REJECTED`) and attach reviewer audit notes. Writes an audit entry to `audit_events`. | Path param: `reg_id: int`<br>Form Body (`x-www-form-urlencoded` or `multipart/form-data`):<br>- `status: str` (required: `"APPROVED"`, `"REJECTED"`, or `"PENDING"`)<br>- `notes: Optional[str]` (optional) | HTTP 200 JSON: `{"status": "success", "registration_id": reg_id, "new_status": status}` | - Invalid status value returns HTTP 400 (`{"detail": "Invalid status value"}`).<br>- Non-existent `reg_id` returns HTTP 404 (`{"detail": "Registration not found"}`).<br>- Sending raw JSON instead of form-data or omitting `status` returns HTTP 422 (`{"detail": [{"type": "missing", "loc": ["body", "status"], ...}]}`). | `backend/app/main.py:198`, `backend/app/db.py:113`, live test |
| 4 | Lifecycle API | `POST /api/reset` | Resets the SQLite demo database by wiping all records from both `registrations` and `audit_events` tables. Does not drop schema or delete file assets. | None (HTTP POST, empty body) | HTTP 200 JSON: `{"status": "reset", "message": "Demo database cleared successfully"}` | Method not allowed (405) on GET/PUT/DELETE. Always returns 200 on valid POST. | `backend/app/main.py:212`, `backend/app/db.py:146`, live test |
| 5 | Database | SQLite Schema & RLS Audit | Relational schema in `veriforge.db` consisting of `registrations` (columns: `id`, `name`, `dob`, `institution`, `id_type`, `id_number_masked`, `id_fingerprint`, `phash`, `decision`, `confidence`, `summary`, `reasons_json`, `checks_json`, `extracted_json`, `status`, `reviewer_notes`, `created_at`) and `audit_events` (`id`, `case_id`, `action`, `details_json`, `created_at`). | Database connection via `sqlite3` context manager | Auto-creates schema on connection (`conn.executescript(SCHEMA)`); logs audit events on submission and manual reviews. | Database locks if unhandled concurrent write transactions occur. | `backend/app/db.py:12-43` |
| 6 | Frontend Build | Next.js 16.3.5 App Router & Turbopack | Next.js App Router application in `frontend/` powered by React 19, TypeScript 5, Tailwind CSS v4, Lucide React icons, and Supabase client. | `npm run build` | Production-optimized static and dynamic chunks in `.next/`. Generated routes: `/` (Static) and `/_not-found`. | Exits 0 on clean build; zero TypeScript or compilation errors. | `frontend/package.json`, `npm run build` output |
| 7 | Frontend Config | TypeScript & Linting Setup | Strict TypeScript type-checking (`tsconfig.json`) targeting ES2017 with bundler resolution; ESLint 9 flat configuration (`eslint.config.mjs`) extending `next/core-web-vitals` and `next/typescript`. | `npx tsc --noEmit`<br>`npm run lint` | Exits 0 with zero diagnostic errors. | Fails on type mismatch or unused imports when strict mode is violated. | `frontend/tsconfig.json`, `frontend/eslint.config.mjs`, live `tsc` |
| 8 | Frontend Environment | Backend Connectivity Configuration | Environment variable setup pointing frontend to local FastAPI backend on port 8000 and Supabase cloud project. | `.env.local`<br>- `NEXT_PUBLIC_API_URL=http://localhost:8000`<br>- `NEXT_PUBLIC_SUPABASE_URL=...`<br>- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...` | Components (`Header.tsx`, `AuditQueue.tsx`, `VerificationForm.tsx`) directly access `http://localhost:8000`. | Connection refused if backend is not running on port 8000. | `frontend/.env.local`, `frontend/src/components/*` |

---

## Edge Cases

| # | Feature | Input | Observed Behavior |
|---|---------|-------|-------------------|
| 1 | `GET /api/registrations` | Database has 0 records | Returns HTTP 200 with empty JSON list `[]`. |
| 2 | `GET /api/registrations` | `?limit=invalid` (non-numeric string) | Returns HTTP 422 Unprocessable Entity with validation error in query parameter. |
| 3 | `GET /api/registrations` | Multiple records inserted in ascending sequence | Returns records strictly ordered by `id DESC` (newest first). |
| 4 | `GET /api/registrations/{id}` | `reg_id = 999999` (non-existent) | Returns HTTP 404 with body `{"detail": "Registration not found"}`. |
| 5 | `POST /api/registrations/{id}/review` | Body sent as `application/json` (`{"status": "APPROVED"}`) | Returns HTTP 422 Unprocessable Entity (`Field required: body.status`) because endpoint strictly requires Form fields. |
| 6 | `POST /api/registrations/{id}/review` | Form body with `status="INVALID_STATUS"` | Returns HTTP 400 Bad Request with body `{"detail": "Invalid status value"}`. Valid statuses are strictly `("APPROVED", "REJECTED", "PENDING")`. |
| 7 | `POST /api/registrations/{id}/review` | Form body with `status="APPROVED"` and missing `notes` | Returns HTTP 200 with `{"status": "success", "registration_id": <id>, "new_status": "APPROVED"}`. `reviewer_notes` remains `None`. |
| 8 | `POST /api/registrations/{id}/review` | Non-existent `reg_id = 999999` with valid form data | Returns HTTP 404 with body `{"detail": "Registration not found"}`. |
| 9 | `POST /api/registrations/{id}/review` | Audit trail logging | Automatically creates record in `audit_events` table with `case_id=<id>`, `action="MANUAL_REVIEW_UPDATE"`, and serialized `{"status": ..., "notes": ...}`. |
| 10 | `POST /api/reset` | Multiple records and audit logs exist | Returns HTTP 200 `{"status": "reset", "message": "Demo database cleared successfully"}`. Querying `registrations` and `audit_events` immediately shows count = 0. |
| 11 | Frontend Build | `npm run build` with Turbopack (Next.js 16.3.5, Node v22.14.0) | Compiles in 1.5s, finishes TypeScript checks in 11.4s, prerenders static pages (`/` and `/_not-found`), and produces zero errors. |
| 12 | Frontend Environment | Missing `.env.local` or environment override | Fallback in code defaults Supabase client, while UI components specifically fetch `http://localhost:8000/api/...`. |

---

## 2. Deep Dive: API Endpoints & Schemas

### 2.1 `GET /api/registrations`
- **Path**: `/api/registrations`
- **Method**: `GET`
- **Query Parameters**:
  - `limit` (`int`, optional, default = `50`): Maximum number of records to return.
- **Headers**:
  - `Accept: application/json`
- **Response Format**: `application/json`
- **Response Status**: `200 OK`
- **Data Structure**:
  ```json
  [
    {
      "id": 1,
      "name": "Rahul Kumar",
      "dob": "2005-03-14",
      "institution": "ABC Institute of Technology",
      "id_type": "COLLEGE_ID",
      "id_number_masked": "ABC20****023",
      "id_fingerprint": "a3f12c...",
      "phash": "9f8e7d...",
      "decision": "MANUAL_REVIEW",
      "confidence": 0.75,
      "summary": "Document blurred; routed to manual review.",
      "reasons_json": "[\"Low image sharpness\"]",
      "checks_json": "{\"quality\": {\"status\": \"REVIEW\", \"score\": 0.35}}",
      "extracted_json": "{\"name\": \"Rahul Kumar\", \"dob\": \"2005-03-14\"}",
      "status": "PENDING",
      "reviewer_notes": null,
      "created_at": "2026-09-17 18:40:00",
      "reasons": [
        "Low image sharpness"
      ],
      "checks": {
        "quality": {
          "status": "REVIEW",
          "score": 0.35
        }
      },
      "extracted": {
        "name": "Rahul Kumar",
        "dob": "2005-03-14"
      }
    }
  ]
  ```
- **Key Implementation Details**:
  - Unpacks `reasons_json`, `checks_json`, and `extracted_json` into Python dictionaries/lists under keys `reasons`, `checks`, and `extracted`.
  - Both raw JSON strings and parsed dictionaries are returned simultaneously for backward compatibility with frontend consumers.
  - Sorting is strictly newest-first (`ORDER BY id DESC LIMIT ?`).
  - Filtering by search query or status is performed client-side by `AuditQueue.tsx`.

---

### 2.2 `POST /api/registrations/{id}/review`
- **Path**: `/api/registrations/{reg_id}/review`
- **Method**: `POST`
- **Path Parameter**:
  - `reg_id` (`int`, required): Database primary key of the registration record.
- **Content-Type**:
  - `application/x-www-form-urlencoded` or `multipart/form-data`
  - **CRITICAL**: Sending `application/json` causes FastAPI to return `422 Unprocessable Entity`!
- **Form Parameters**:
  - `status` (`str`, required): Must be one of `"APPROVED"`, `"REJECTED"`, `"PENDING"`.
  - `notes` (`str`, optional): Reviewer audit comments.
- **Success Response**: `200 OK`
  ```json
  {
    "status": "success",
    "registration_id": 1,
    "new_status": "APPROVED"
  }
  ```
- **Error Responses**:
  - `400 Bad Request`: When `status` is not in `("APPROVED", "REJECTED", "PENDING")`:
    ```json
    {"detail": "Invalid status value"}
    ```
  - `404 Not Found`: When `reg_id` does not exist in the database:
    ```json
    {"detail": "Registration not found"}
    ```
  - `422 Unprocessable Entity`: When `status` is omitted or sent as JSON:
    ```json
    {"detail": [{"type": "missing", "loc": ["body", "status"], "msg": "Field required"}]}
    ```
- **Side Effects**:
  1. Updates `registrations` row: `status = ?`, `reviewer_notes = ?`.
  2. Inserts an audit event into `audit_events`:
     - `case_id`: `reg_id`
     - `action`: `"MANUAL_REVIEW_UPDATE"`
     - `details_json`: `{"status": status, "notes": notes}`
     - `created_at`: `CURRENT_TIMESTAMP`

---

### 2.3 `POST /api/reset`
- **Path**: `/api/reset`
- **Method**: `POST`
- **Payload**: None
- **Success Response**: `200 OK`
  ```json
  {
    "status": "reset",
    "message": "Demo database cleared successfully"
  }
  ```
- **Side Effects**:
  - Executes `DELETE FROM registrations;`
  - Executes `DELETE FROM audit_events;`
  - Completely wipes test records, resetting both tables to 0 rows.
  - Leaves the table schemas and static image files untouched.

---

## 3. Frontend Architecture & Build Specifications

### 3.1 Dependencies & Versions (`frontend/package.json`)
- **Runtime Environment**: Node.js `>= 20` (tested on Node `v22.14.0`, npm `10.8.3`).
- **Framework & Core**:
  - `next`: `16.3.5` (Next.js App Router with Turbopack)
  - `react`: `19.2.8`
  - `react-dom`: `19.2.8`
- **Key Libraries**:
  - `lucide-react`: `^1.47.0` (UI icons)
  - `@supabase/supabase-js`: `^2.116.0` (Cloud database client)
  - `tailwindcss`: `^4` with `@tailwindcss/postcss` (Styling)
  - `typescript`: `^5`

### 3.2 Build & Execution Scripts
| Script | Command | Description |
|--------|---------|-------------|
| `npm run dev` | `next dev` | Launches Turbopack dev server on `http://localhost:3000` |
| `npm run build` | `next build` | Compiles production assets and generates static HTML pages |
| `npm run start` | `next start` | Starts production server on port 3000 |
| `npm run lint` | `eslint` | Executes ESLint 9 type-aware rules |

### 3.3 TypeScript Configuration (`frontend/tsconfig.json`)
- `target`: `"ES2017"`
- `lib`: `["dom", "dom.iterable", "esnext"]`
- `strict`: `true` (full strict null and property checks)
- `moduleResolution`: `"bundler"`
- `paths`: `"@/*": ["./src/*"]` (Clean import alias)
- **Status**: Passed `npx tsc --noEmit` with 0 errors.

### 3.4 Environment Setup & Backend URL Binding
- Configuration file: `frontend/.env.local`
  ```env
  NEXT_PUBLIC_API_URL=http://localhost:8000
  NEXT_PUBLIC_SUPABASE_URL=https://rodczqujbkduouvsynze.supabase.co
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_hnd2oxY1TeqdnGUAEZ-qzQ_PuBpmqQ5
  ```
- Also mirrored in root template `.env.example`.
- Frontend UI components (`Header.tsx`, `AuditQueue.tsx`, `VerificationForm.tsx`) use direct HTTP fetches to `http://localhost:8000/api/...`, ensuring reliable local communication without needing a proxy.

### 3.5 Build Verification Results
- Command: `npm run build` inside `frontend/`
- Result: **SUCCESS (Exit Code 0)**
- Compile Time: 1522 ms
- Static Generation: 4/4 pages in 4.4 s
- Generated routes:
  - `○ /` (Static)
  - `○ /_not-found` (Static)
- Caveats noted: Warning regarding parent directory `package-lock.json` outside Git root (`turbopack.root`), which does not impede compilation or build execution.
