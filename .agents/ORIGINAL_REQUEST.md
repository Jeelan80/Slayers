# Original User Request

## 2026-09-17T18:44:54Z

Execute a comprehensive, real-time live HTTP end-to-end test suite against the running VeriForge verification platform (FastAPI backend + Next.js frontend), verifying detection accuracy, performance, and API responses across all attack vectors (tampering, duplicate reuse, blur gating, and face matching).

Working directory: H:\Projects\Hackingly\team-slayers-hackingly
Integrity mode: development

## Requirements

### R1. Live Server Lifecycle Management
Launch and maintain a live FastAPI backend process on `http://localhost:8000`. Ensure `GET /api/health` reports status `ok` before initiating test payloads.

### R2. Subsystem & Module Real-Time Verification
Submit real-time multipart/form-data HTTP requests to `/api/verify` and assert expected behavior for each module:
1. **DQVC Engine (`services/qr.py`)**: Verify 3-way cross-validation (`OCR ↔ QR ↔ Registration Form`). Confirm tampered text vs QR payload raises critical forgery flags.
2. **Passive Forensics & Quality Gate (`services/forensics.py`)**: Confirm Laplacian blur detection routes low-variance cards to `MANUAL_REVIEW` without false-positive rejection; verify ELA recompression anomaly scoring.
3. **Sybil & Duplicate Defense (`services/duplicate.py`)**: Confirm HMAC-SHA-256 ID fingerprint collision detection triggers `REJECT` with `EXACT_ID_DUPLICATE` flag when an identical card is registered under a different name.
4. **Academic Enrollment Service (`services/academic.py`)**: Verify mock DigiLocker / NAD integration across `ACTIVE`, `GRADUATED`, `SUSPENDED`, and `NOT_FOUND` student statuses.
5. **Decision & Evidence Fusion (`services/decision.py`)**: Verify calibrated confidence formula calculation and deterministic 3-way decision policies (`APPROVE`, `MANUAL_REVIEW`, `REJECT`).

### R3. Organizer Audit & Lifecycle Operations
Verify database operations over HTTP:
- Confirm `GET /api/registrations` returns recorded submissions with structured JSON checks and extracted data.
- Confirm `POST /api/registrations/{id}/review` successfully updates a `PENDING` registration status to `APPROVED` with reviewer audit notes.
- Confirm `POST /api/reset` cleanly wipes demo data when requested.

### R4. Frontend Production Build & Health Assurance
Execute `npm run build` in `frontend/` to ensure zero compilation or TypeScript errors, and verify the frontend environment configuration properly points to `http://localhost:8000`.

## Acceptance Criteria

### Verification & Test Criteria
- [ ] Backend runs live on `http://localhost:8000` and passes health checks.
- [ ] Live HTTP POST to `/api/verify` with genuine ID yields `APPROVE` with confidence $\ge 0.80$.
- [ ] Live HTTP POST to `/api/verify` with tampered ID yields `REJECT` or critical fraud flags.
- [ ] Live HTTP POST to `/api/verify` with reused ID under a different name yields `REJECT` and `EXACT_ID_DUPLICATE`.
- [ ] Live HTTP POST to `/api/verify` with blurry ID triggers `MANUAL_REVIEW` with zero false-positive hard rejections.
- [ ] Live HTTP POST to `/api/verify` with underage DOB triggers `REJECT` by policy.
- [ ] Organizer review override updates audit trail correctly via API.
- [ ] Frontend builds cleanly with zero TypeScript errors.
- [ ] Comprehensive test summary report is output with pass/fail counts and response latency per scenario.
