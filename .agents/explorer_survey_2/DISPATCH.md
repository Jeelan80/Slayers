# Dispatch Task: Subsystem Verification Services Explorer

## Objective
Investigate the verification pipeline and services in the VeriForge codebase to determine:
1. `services/qr.py`: DQVC Engine implementation, QR extraction, OCR extraction, form payload comparison, forgery detection logic.
2. `services/forensics.py`: Laplacian blur detection threshold, ELA (Error Level Analysis) recompression anomaly scoring, passive quality gating.
3. `services/duplicate.py`: HMAC-SHA-256 fingerprint generation, database duplicate matching, `EXACT_ID_DUPLICATE` flag triggering conditions.
4. `services/academic.py`: Mock DigiLocker / NAD student status verification (`ACTIVE`, `GRADUATED`, `SUSPENDED`, `NOT_FOUND`) and rules.
5. `services/decision.py`: Decision and evidence fusion, confidence formula weights/calculation, deterministic 3-way policies (`APPROVE`, `MANUAL_REVIEW`, `REJECT`), age/DOB policies.
6. How `/api/verify` accepts multipart/form-data requests, parses fields/files, coordinates services, and formats the response JSON.

## Input Files
- `H:\Projects\Hackingly\team-slayers-hackingly\.agents\ORIGINAL_REQUEST.md`
- Backend services under `H:\Projects\Hackingly\team-slayers-hackingly/services` or equivalent path, routers, models.

## Working Directory
`H:\Projects\Hackingly\team-slayers-hackingly\.agents\explorer_survey_2`

## Output Requirements
- Write your comprehensive findings to `survey_services.md` in your working directory.
- Deliver `handoff.md` with verified evidence chains, formulas, test vectors, and edge cases.
- Send a completion message via `send_message` when done.
