# VeriForge — Frontend

AI-powered identity & eligibility verification console for the **Hackingly AI Build Challenge (PS-003)**.

Built with **Next.js 14 (App Router) + TypeScript + Tailwind CSS v4 + Lucide React**.

The frontend consumes the FastAPI backend at `NEXT_PUBLIC_API_URL` (default `http://localhost:8000`).

---

## Quick start

```bash
# 1. Install dependencies
npm install

# 2. Confirm the backend URL (default = http://localhost:8000)
cat .env.local

# 3. Run the dev server
npm run dev

# 4. Open http://localhost:3000
```

Build & typecheck:

```bash
npm run build      # production build (also runs TS type-check)
npm run typecheck  # standalone tsc --noEmit
```

---

## What's inside

Three tabs, one console:

### 🔍 Verify Participant
- Drag-and-drop ID upload (or click) + optional selfie (file or **live webcam**)
- 2-column form: name · DOB · ID number · institution · email
- 5-stage animated pipeline: **Upload → OCR → Tamper → Cross-Validate → Decision**
- Right pane: colour-coded decision banner, SVG confidence gauge (red / amber / teal),
  extracted-info card, 8 evidence check tiles, strong-flag pills, reasoning list,
  and a timestamped audit log.

### 📋 Audit Queue
- 4 stat cards (Total / Approved / Manual Review / Rejected)
- Filter pills: ALL / PENDING / APPROVED / REJECTED
- Name search
- Registrations table with inline confidence bars, decision pills, strong-flag chips
- One-click **Approve / Reject** for `MANUAL_REVIEW` rows
- Auto-refresh every 10 s with "updated Ns ago" label

### 🧪 Demo Scenarios
- 4 one-click scenarios: Genuine · Duplicate · Tampered DOB · Underage
- Cards are **generated client-side on HTML5 Canvas** and submitted to `/api/verify`
- Pipeline progress shown live; last-run decision + confidence pinned to each card

---

## Environment

`.env.local`
```
NEXT_PUBLIC_API_URL=http://localhost:8000
```

The backend must have CORS enabled for `http://localhost:3000`.
No auth, no server-side secrets in the frontend.

---

## File structure

```
frontend/
├── src/
│   ├── app/
│   │   ├── layout.tsx           Inter font, metadata, root shell
│   │   ├── page.tsx             3-tab root + toast host + pipeline state
│   │   └── globals.css          Tailwind v4 + brand tokens
│   ├── components/
│   │   ├── Header.tsx           Health poll (8 s) + reset
│   │   ├── PipelineProgress.tsx 5-stage animated stepper
│   │   ├── VerificationForm.tsx Upload / selfie / fields / submit
│   │   ├── VerificationResult.tsx Banner + gauge + evidence + audit log
│   │   ├── ConfidenceGauge.tsx  SVG 270° arc, red/amber/teal
│   │   ├── AuditQueue.tsx       Table + filters + inline actions
│   │   ├── DemoScenarios.tsx    Canvas-generated scenario cards
│   │   ├── WebcamModal.tsx      Live webcam capture → File
│   │   └── Toast.tsx            Slide-in notifications
│   ├── types/index.ts           API + UI type contracts
│   └── utils/
│       ├── api.ts               fetch wrappers for /api/*
│       └── cardGenerator.ts     Canvas synthetic ID card factory
├── .env.local
├── next.config.ts
├── postcss.config.mjs
├── tsconfig.json
└── package.json
```

---

## Design system

Mirrors [hackingly.in](https://hackingly.in) visual language:

| Token             | Hex        | Use                                          |
| ----------------- | ---------- | -------------------------------------------- |
| Primary Teal      | `#009E7E`  | CTAs, active tabs, links, success badges     |
| Primary Teal Dark | `#007A60`  | Button hover                                 |
| Surface           | `#f7f9fc`  | Input backgrounds, subtle card wells         |
| Border Subtle     | `#e5e9f0`  | Card & input borders                         |
| Text Primary      | `#1a1f2e`  | Headings, body                               |
| Text Muted        | `#6b7280`  | Labels, meta                                 |
| Orange            | `#FF6B2B`  | Logo, LIVE badge                             |
| Success / Warn / Danger | Tailwind emerald / amber / rose | Decision states |

Font: **Inter** via `next/font/google`.
Icons: **Lucide React** (no other UI libraries).

---

## Deploy

Push `frontend/` to Vercel. Set `NEXT_PUBLIC_API_URL` to your backend host.
No server-side secrets required.
