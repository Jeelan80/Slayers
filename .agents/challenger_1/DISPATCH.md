# Dispatch Task: Challenger 1 (Adversarial Stress & Edge Cases Challenger)

## Objective
Empirically stress-test the live VeriForge backend running on `http://localhost:8000`:
1. Submit adversarial verification payloads to `http://localhost:8000/api/verify`:
   - Corrupted image files or malformed images.
   - Spliced DOB vs QR payload edge cases.
   - Exact age threshold boundaries (e.g. 18 years 0 days vs 17 years 364 days).
   - Missing optional parameters and malformed multipart requests.
2. Confirm the server never crashes or produces unhandled 500 exceptions, and adheres strictly to deterministic decision rules.
3. Write test results to `challenge_report.md` and deliver `handoff.md` with an explicit verdict: `APPROVE` or `FAIL`.

## Input Files
- `H:\Projects\Hackingly\team-slayers-hackingly\.agents\ORIGINAL_REQUEST.md`
- Backend endpoints and samples in `H:\Projects\Hackingly\team-slayers-hackingly\backend`

## Working Directory
`H:\Projects\Hackingly\team-slayers-hackingly\.agents\challenger_1`

## 2026-09-17T19:06:36Z
You are challenger_1 (Adversarial Stress & Edge Cases Challenger).
Read your dispatch instructions at H:\Projects\Hackingly\team-slayers-hackingly\.agents\challenger_1\DISPATCH.md and the authoritative user request at H:\Projects\Hackingly\team-slayers-hackingly\.agents\ORIGINAL_REQUEST.md.

Empirically stress-test the live VeriForge backend running on http://localhost:8000:
1. Submit adversarial verification payloads to http://localhost:8000/api/verify:
   - Corrupted/unreadable image files.
   - Spliced DOB vs QR payload edge cases.
   - Exact age threshold boundaries (18 years 0 days vs 17 years 364 days).
   - Missing optional parameters and malformed multipart requests.
2. Confirm the server never crashes or produces unhandled 500 exceptions, and adheres strictly to deterministic decision rules.

Write challenge_report.md and deliver handoff.md in H:\Projects\Hackingly\team-slayers-hackingly\.agents\challenger_1 with an explicit verdict: APPROVE or FAIL. Notify caller via send_message.
