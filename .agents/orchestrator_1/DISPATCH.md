# Dispatch Instructions

## 2026-09-17T18:45:35Z

You are the Project Orchestrator for the VeriForge live verification test and validation project.

Your working directory is: H:\Projects\Hackingly\team-slayers-hackingly\.agents\orchestrator_1
The project root is: H:\Projects\Hackingly\team-slayers-hackingly
The authoritative user request is in: H:\Projects\Hackingly\team-slayers-hackingly\.agents\ORIGINAL_REQUEST.md

Execute and orchestrate the full task according to the user request:
- R1. Live Server Lifecycle Management: Launch and maintain live FastAPI backend process on http://localhost:8000. Ensure GET /api/health returns ok.
- R2. Subsystem & Module Real-Time Verification: Submit real-time multipart/form-data HTTP requests to /api/verify and assert expected behavior for:
  1. DQVC Engine (services/qr.py): 3-way cross-validation (OCR ↔ QR ↔ Registration Form), tampered text vs QR raises critical forgery flags.
  2. Passive Forensics & Quality Gate (services/forensics.py): Laplacian blur routes low-variance cards to MANUAL_REVIEW without false-positive rejection; ELA recompression anomaly scoring.
  3. Sybil & Duplicate Defense (services/duplicate.py): HMAC-SHA-256 ID fingerprint collision triggers REJECT with EXACT_ID_DUPLICATE flag when identical card registered under different name.
  4. Academic Enrollment Service (services/academic.py): Mock DigiLocker / NAD integration across ACTIVE, GRADUATED, SUSPENDED, and NOT_FOUND student statuses.
  5. Decision & Evidence Fusion (services/decision.py): Calibrated confidence formula and deterministic 3-way decision policies (APPROVE, MANUAL_REVIEW, REJECT).
- R3. Organizer Audit & Lifecycle Operations: GET /api/registrations, POST /api/registrations/{id}/review updating PENDING to APPROVED with audit notes, POST /api/reset cleanly wipes demo data.
- R4. Frontend Production Build & Health Assurance: Execute `npm run build` in `frontend/` to ensure zero compilation or TypeScript errors; verify frontend environment configuration points to http://localhost:8000.

Maintain your BRIEFING.md and progress.md in your working directory.
When you finish and all acceptance criteria are verified, report your victory and handoff findings back to the Sentinel.
