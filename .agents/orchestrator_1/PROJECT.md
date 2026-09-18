# Project: VeriForge Live Verification & E2E Validation

## Architecture
- **Backend**: FastAPI 0.141.1 on Python 3.13.1 running on `http://localhost:8000` via Uvicorn.
- **Core Subsystems**:
  - `services/qr.py`: DQVC Engine, 3-way cross-validation (OCR <-> QR <-> Form).
  - `services/forensics.py`: Laplacian blur variance gating (<40.0 -> MANUAL_REVIEW) and ELA recompression anomaly scoring.
  - `services/duplicate.py`: HMAC-SHA-256 fingerprint collision detection -> EXACT_ID_DUPLICATE -> REJECT.
  - `services/academic.py`: Mock DigiLocker / NAD student status verification (ACTIVE, GRADUATED, SUSPENDED, NOT_FOUND).
  - `services/decision.py`: 6-component calibrated fusion formula and deterministic 3-way policy (APPROVE >= 0.78, MANUAL_REVIEW, REJECT).
  - `db.py`: SQLite persistence (`registrations`, `audit_events`).
- **Frontend**: Next.js 16.3.5 (Turbopack) with React 19 and TypeScript 5 in `frontend/`, configured to talk to `http://localhost:8000`.

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Live Server Lifecycle (R1) | Start FastAPI server on port 8000, verify GET /api/health ok | M1 | ORIGINAL_REQUEST §R1 |
| 2 | Frontend Build & Health (R4) | npm run build in frontend/ with zero errors, env URL config | M1 | ORIGINAL_REQUEST §R4 |
| 3 | DQVC 3-Way Cross-Validation (R2.1) | OCR <-> QR <-> Form cross-validation, tamper contradiction flag | M2 | ORIGINAL_REQUEST §R2.1 |
| 4 | Passive Forensics Gating (R2.2) | Laplacian blur routes to MANUAL_REVIEW, zero false rejections | M2 | ORIGINAL_REQUEST §R2.2 |
| 5 | Sybil & Duplicate Defense (R2.3) | HMAC-SHA-256 collision detection -> EXACT_ID_DUPLICATE -> REJECT | M2 | ORIGINAL_REQUEST §R2.3 |
| 6 | Academic Status Verification (R2.4) | DigiLocker/NAD active/graduated/suspended/not_found checks | M2 | ORIGINAL_REQUEST §R2.4 |
| 7 | Decision & Evidence Fusion (R2.5) | Calibrated confidence formula and 3-way policy gating | M2 | ORIGINAL_REQUEST §R2.5 |
| 8 | Submissions Retrieval (R3.1) | GET /api/registrations returns structured checks and extracted data | M3 | ORIGINAL_REQUEST §R3 |
| 9 | Organizer Review Override (R3.2) | POST /api/registrations/{id}/review updates PENDING -> APPROVED | M3 | ORIGINAL_REQUEST §R3 |
| 10 | Demo Database Reset (R3.3) | POST /api/reset cleanly wipes demo data while preserving schema | M3 | ORIGINAL_REQUEST §R3 |
| 11 | Adversarial & E2E Validation | Multi-tier test suite execution, latency measurement, forensic audit | M4 | ORIGINAL_REQUEST Acceptance Criteria |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Server Lifecycle & Frontend Build Assurance | Launch backend live server, verify health check, run frontend build | none | PLANNED |
| M2 | Subsystem Live HTTP Verification | Live /api/verify tests for genuine, tampered, blurry, duplicate, underage | M1 | PLANNED |
| M3 | Organizer Audit & Lifecycle Operations | Live test for registrations list, review override, and reset | M2 | PLANNED |
| M4 | E2E Adversarial Testing & Forensic Audit | Challengers stress tests, forensic integrity audit, final synthesis | M3 | PLANNED |

## Interface Contracts
### Client <-> Backend API
- `GET /api/health` -> `{"status":"ok","service":"VeriForge","version":"0.1.0",...}` (HTTP 200)
- `POST /api/verify` (multipart/form-data: `name`, `dob`, `id_number`, `institution`, `id_type`, `file`, optional `selfie`, `min_age`) -> JSON containing `decision`, `confidence`, `reasons`, `checks`, `extracted`, `registration_id`.
- `GET /api/registrations?limit=N` -> JSON Array of registration objects.
- `POST /api/registrations/{id}/review` (form data: `status`, optional `notes`) -> `{"status":"success","registration_id":int,"new_status":str}`.
- `POST /api/reset` -> `{"status":"reset","message":"Demo database cleared successfully"}`.

## Code Layout
- `backend/app/main.py`: FastAPI entrypoint, route handlers, middleware.
- `backend/app/services/`: qr.py, forensics.py, duplicate.py, academic.py, decision.py, ocr.py, face.py.
- `backend/app/db.py`: SQLite connection and query helpers.
- `backend/tests/`: Pytest automated test suite.
- `backend/scripts/`: Smoke tests, sample generators.
- `frontend/`: Next.js frontend application.
