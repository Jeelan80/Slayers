# Dispatch Task: Live Execution & Validation Worker

## MANDATORY INTEGRITY WARNING
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

## Objective
Execute and validate the complete VeriForge live verification test suite according to `H:\Projects\Hackingly\team-slayers-hackingly\.agents\ORIGINAL_REQUEST.md`:
1. **R1: Live Server Lifecycle Management**:
   - Launch and maintain a live FastAPI backend process on `http://localhost:8000` (e.g. using `python -m uvicorn app.main:app --host 0.0.0.0 --port 8000` from `backend/`).
   - Query `GET /api/health` and verify HTTP 200 with `status: "ok"`. Keep the server running in background.
2. **R2: Subsystem & Module Real-Time Verification**:
   - Submit real-time `multipart/form-data` HTTP requests to `http://localhost:8000/api/verify` using the sample images in `backend/app/static/samples/` or generated test vectors:
     - **Test 1: Genuine ID (`ABC20261023`, Rahul Kumar, 2005-10-23)**: Assert `APPROVE` with confidence $\ge 0.80$, DQVC status `CROSS_VALIDATED`, clean checks.
     - **Test 2: Tampered Text vs QR ID (`spliced_tampered.jpg` or tampered payload)**: Assert `REJECT` or critical fraud flags (`QR_OCR_MISMATCH`, tamper score 1.0).
     - **Test 3: Blurry ID (low Laplacian variance < 40.0)**: Assert `MANUAL_REVIEW` with `LOW_QUALITY` and ZERO false-positive hard rejections (`REJECT`).
     - **Test 4: Sybil / Duplicate ID collision**: Submit the genuine ID under a different name (e.g. `Vikram Singh`, `ABC20261023`). Assert `REJECT` with `EXACT_ID_DUPLICATE`.
     - **Test 5: Academic Suspension & Eligibility**: Submit student `SUSP2025771` (Dev Sharma, suspended) or underage DOB (e.g. 2012 with min_age 18). Assert `REJECT` by policy.
   - Measure and record response latency (in ms) for each scenario.
3. **R3: Organizer Audit & Lifecycle Operations**:
   - `GET /api/registrations`: Verify it returns recorded submissions with structured checks and extracted data.
   - `POST /api/registrations/{id}/review`: Submit form data `status=APPROVED` and `notes="Manual audit approval: verified physical document"` for a pending/review registration. Verify status update and audit log.
   - `POST /api/reset`: Issue reset request and verify demo registrations and audit events are cleanly wiped.
4. **R4: Frontend Production Build & Health Assurance**:
   - In `frontend/`, verify environment configuration in `.env.local` points to `http://localhost:8000`.
   - Run `npx tsc --noEmit` and `npm run build` in `frontend/`. Confirm 0 errors and production build success.
   - Test frontend asset availability or connection to backend.

## Working Directory
`H:\Projects\Hackingly\team-slayers-hackingly\.agents\worker_execution_1`

## Required Outputs
- Write detailed execution report to `execution_report.md` in your working directory.
- Deliver `handoff.md` with:
  - Observation: exact curl/test commands, outputs, latencies, pass/fail results.
  - Logic Chain: why each requirement R1-R4 is satisfied.
  - Caveats: any environment specifics.
  - Conclusion: final summary of acceptance criteria.
  - Verification Method: reproducible commands for reviewers.
- Send a completion message via `send_message` when done.

## 2026-09-17T18:58:00Z
<USER_REQUEST>
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

You are worker_execution_1 (Live Execution & Validation Worker).
Read your dispatch instructions at H:\Projects\Hackingly\team-slayers-hackingly\.agents\worker_execution_1\DISPATCH.md and the authoritative request at H:\Projects\Hackingly\team-slayers-hackingly\.agents\ORIGINAL_REQUEST.md.

Your mission:
1. R1: Live Server Lifecycle Management:
   - Launch and maintain a live FastAPI backend process on http://localhost:8000 (from H:\Projects\Hackingly\team-slayers-hackingly\backend with command: python -m uvicorn app.main:app --host 0.0.0.0 --port 8000). Ensure the process remains running in the background.
   - Assert GET http://localhost:8000/api/health returns HTTP 200 with {"status":"ok",...}.
2. R2: Subsystem & Module Real-Time Verification:
   - Submit real-time multipart/form-data HTTP POST requests to http://localhost:8000/api/verify using sample images in backend/app/static/samples/ or generated test vectors:
     - Test 1: Genuine student ID (ABC20261023, Rahul Kumar, 2005-10-23). Assert APPROVE with confidence >= 0.80, status CROSS_VALIDATED.
     - Test 2: Tampered Text vs QR ID (contradictory text vs QR payload). Assert REJECT or critical fraud flags (QR_OCR_MISMATCH, tamper_detected).
     - Test 3: Blurry ID (low Laplacian variance < 40.0). Assert MANUAL_REVIEW with LOW_QUALITY and ZERO false-positive hard rejections.
     - Test 4: Sybil / Duplicate ID collision (identical ID registered under a different name). Assert REJECT with EXACT_ID_DUPLICATE.
     - Test 5: Academic Suspension & Eligibility (suspended student SUSP2025771 or underage DOB). Assert REJECT by policy.
   - Measure and record response latency (in ms) for each test scenario.
3. R3: Organizer Audit & Lifecycle Operations:
   - Test GET http://localhost:8000/api/registrations: assert returned array with structured checks, reasons, extracted.
   - Test POST http://localhost:8000/api/registrations/{id}/review: send form data status=APPROVED with audit notes. Assert HTTP 200 and audit log entry.
   - Test POST http://localhost:8000/api/reset: assert HTTP 200 and clean wipe of demo data.
4. R4: Frontend Production Build & Health Assurance:
   - In H:\Projects\Hackingly\team-slayers-hackingly\frontend, verify environment config (.env.local points to http://localhost:8000).
   - Run npx tsc --noEmit and npm run build in frontend/. Assert zero compilation or TypeScript errors.

Write execution_report.md and handoff.md in H:\Projects\Hackingly\team-slayers-hackingly\.agents\worker_execution_1.
When done, notify the caller via send_message with a complete summary and absolute path to your handoff.md. Keep the live server running if possible or explain lifecycle status.
</USER_REQUEST>
