# Dispatch Task: API Spec & Frontend Build Investigator

## Objective
Investigate the organizer endpoints, lifecycle operations, and the frontend codebase:
1. `GET /api/registrations`: Endpoint implementation, response schema, filtering/pagination, data structures returned.
2. `POST /api/registrations/{id}/review`: Endpoint schema, required payload (e.g. status transition to `APPROVED`, audit notes), validation, and state updates.
3. `POST /api/reset`: Endpoint logic, what demo data is wiped, database reset behavior.
4. Frontend structure in `frontend/`:
   - `package.json`: scripts, dependencies, build tool (Next.js/Vite/etc.).
   - TypeScript configuration (`tsconfig.json`), linting.
   - Environment configuration (`.env`, `.env.local`, `.env.production`), API endpoint pointing to `http://localhost:8000`.
   - Any known build caveats or prerequisites (Node version, npm install, build command).

## Input Files
- `H:\Projects\Hackingly\team-slayers-hackingly\.agents\ORIGINAL_REQUEST.md`
- Codebase files in `frontend/` and backend routers/endpoints.

## Working Directory
`H:\Projects\Hackingly\team-slayers-hackingly\.agents\spec_miner_survey_3`

## Output Requirements
- Write your comprehensive findings to `survey_spec.md` in your working directory.
- Deliver `handoff.md` with verified schemas, exact curl examples, and build steps.
- Send a completion message via `send_message` when done.

## 2026-09-17T18:46:22Z
You are spec_miner_survey_3 (API Spec & Frontend Build Investigator).
Read your dispatch instructions at H:\Projects\Hackingly\team-slayers-hackingly\.agents\spec_miner_survey_3\DISPATCH.md and the authoritative request at H:\Projects\Hackingly\team-slayers-hackingly\.agents\ORIGINAL_REQUEST.md.
Investigate the organizer endpoints, lifecycle operations, and the frontend codebase:
1. GET /api/registrations: Endpoint implementation, response schema, filtering/pagination, data structures returned.
2. POST /api/registrations/{id}/review: Endpoint schema, required payload (status transition to APPROVED, audit notes), validation, and state updates.
3. POST /api/reset: Endpoint logic, what demo data is wiped, database reset behavior.
4. Frontend structure in frontend/:
   - package.json: scripts, dependencies, build tool (Next.js/Vite/etc.).
   - TypeScript configuration (tsconfig.json), linting.
   - Environment configuration (.env, .env.local, .env.production), API endpoint pointing to http://localhost:8000.
   - Any known build caveats or prerequisites (Node version, npm install, build command).

Write survey_spec.md and handoff.md in H:\Projects\Hackingly\team-slayers-hackingly\.agents\spec_miner_survey_3.
When complete, notify the caller via send_message with a summary and the absolute path to your handoff.md.
