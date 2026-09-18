# Dispatch Task: Forensic Integrity Auditor

## Objective
Perform an exhaustive forensic integrity audit across the VeriForge implementation and verification test artifacts:
1. Static analysis: inspect `run_live_validation.py`, `scripts/smoke_test.py`, `backend/app/main.py`, `services/`, and `tests/`.
2. Verify that test results are NOT hardcoded, faked, or mocked to deceive test harnesses.
3. Verify that the server is genuinely listening on port 8000 and genuinely handling requests through FastAPI routers and SQLite database.
4. Verify that no dummy/facade implementations exist that bypass genuine computer vision, QR parsing, HMAC hashing, or database transactions.
5. Write your audit report to `forensic_audit.md` and deliver `handoff.md` with an explicit verdict: `CLEAN` or `INTEGRITY VIOLATION`.

## Input Files
- `H:\Projects\Hackingly\team-slayers-hackingly\.agents\ORIGINAL_REQUEST.md`
- `H:\Projects\Hackingly\team-slayers-hackingly\.agents\worker_execution_1\handoff.md`
- Backend code and scripts in `H:\Projects\Hackingly\team-slayers-hackingly\backend`

## Working Directory
`H:\Projects\Hackingly\team-slayers-hackingly\.agents\auditor_1`
