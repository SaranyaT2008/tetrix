# 🩺 MediLens AI

### Patient-Friendly Medical Report Explainer

> **Understand your report. Prepare better questions. Stay informed, without replacing your healthcare professional.**

MediLens AI is a web application that turns complex laboratory and medical reports into clear, structured, patient-friendly information. A user uploads a report, and the app extracts the tests, compares each value with the reference range **printed on the report**, explains the medical terms in simple language (English, Tamil or Hindi) and suggests questions to discuss with a qualified healthcare professional.

MediLens AI does **not** diagnose diseases, prescribe treatments or recommend medication changes.

---

## Table of Contents

- [Problem Statement](#problem-statement)
- [Features](#features)
- [How It Works](#how-it-works)
- [Status Labels](#status-labels)
- [Safety and Responsible AI](#safety-and-responsible-ai)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Privacy](#privacy)
- [Limitations](#limitations)
- [Future Scope](#future-scope)
- [Screenshots](#screenshots)
- [Disclaimer](#disclaimer)

---

## Problem Statement

Patients often receive medical and laboratory reports without any explanation. The reports contain technical terms, abbreviations, units and reference ranges that are hard to understand, and they are rarely available in the patient's own language. This leads to confusion, anxiety and unproductive consultations.

MediLens AI converts a supplied report into understandable language, highlights values relative to the reported ranges, and helps the user prepare questions for their doctor, while clearly avoiding independent diagnosis.

---

## Features

- **Sign-in:** users register with a username, email and password, or sign in with Google.
- **Private reports:** each user can see only their own saved reports.
- **Report upload:** upload a medical or laboratory report.
- **AI extraction:** an AI service reads the report and returns the test name, value, unit, reference range, a confidence score and the source text for every test, along with the report date and laboratory name.
- **Reference-range engine:** compares each value only with the range printed on the report. It never invents a range.
- **Verification flags:** values or ranges that are unclear are marked as needing verification instead of being judged.
- **Plain-language explanations:** each test and term is explained in simple words.
- **Multilingual:** English, Tamil and Hindi, using i18next.
- **Doctor questions:** suggested questions to ask a healthcare professional.
- **Safety guardrail:** AI output is checked so it does not diagnose, prescribe or advise treatment.
- **Saved reports:** reports and results are stored in the database.
- **Dashboard:** report information shown with charts.
- **Disclaimer:** shown on every result.

---

## How It Works

```text
Sign in (password or Google)
      ↓
Select language
      ↓
Upload report
      ↓
AI extraction (tests, values, units, ranges, confidence)
      ↓
Reference-range engine (compares with the printed range)
      ↓
AI explanation and doctor questions
      ↓
Safety guardrail
      ↓
Result page + saved report
```

The reference-range engine, AI extraction, AI explanations and the safety guardrail live in server-only code (`src/lib/medilens.server.ts`) and are never imported by client code. The interface calls them through server functions (`src/lib/medilens.functions.ts`).

---

## Status Labels

The status of each value is decided by the reference-range engine, not by the AI.

| Status | Meaning |
|---|---|
| Within reported range | The value is inside the range printed on the report |
| Below reported range | The value is lower than the printed range |
| Above reported range | The value is higher than the printed range |
| Needs verification | The value or range may have been misread and should be checked against the original report |
| Unknown | No usable reference range is available |

The engine reads printed ranges such as `4.0 – 11.0`, `< 200` and `> 40`.

---

## Safety and Responsible AI

- No diagnosis, no prescriptions and no treatment or medication recommendations.
- Values are compared only with the ranges printed on the report, because normal ranges differ between laboratories, age and sex.
- Unclear extractions are flagged for verification.
- AI output passes through a safety guardrail.
- Every result carries a disclaimer that directs the user to a qualified healthcare professional.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Language | TypeScript 5.8 |
| Frontend | React 19.2 |
| Framework | TanStack Start 1.168 and TanStack Router 1.170 |
| Data fetching | TanStack Query 5 |
| Server runtime | Nitro |
| Build tool | Vite 8 |
| Styling | Tailwind CSS 4.2, shadcn/ui, Radix UI |
| Icons and alerts | Lucide React, Sonner |
| Multilingual | i18next 26, react-i18next 17 |
| Forms and validation | React Hook Form 7, Zod 3 |
| Charts | Recharts 2.15 |
| Authentication | Lovable Cloud authentication (username, email and password, plus Google sign-in) |
| Database | Supabase (PostgreSQL) with supabase-js 2 |
| ORM | Drizzle ORM 0.45, Drizzle Kit, postgres driver |
| AI | AI service called from server code only |
| Tooling | Bun, ESLint 9, Prettier 3, Lovable |

---

## Project Structure

```text
.
├── drizzle/                 # Drizzle schema (schema.ts) and migrations
├── public/                  # Static assets
├── src/
│   ├── components/          # UI components
│   ├── hooks/               # Custom React hooks
│   ├── integrations/        # Backend integrations
│   ├── lib/
│   │   ├── medilens.server.ts      # Server-only: range engine, AI extraction, explanations, guardrail
│   │   ├── medilens.functions.ts   # Server functions used by the interface
│   │   ├── test-knowledge.ts       # Reference knowledge about tests
│   │   ├── i18n.ts                 # i18next setup
│   │   ├── language.tsx            # Language selection
│   │   └── utils.ts
│   ├── locales/             # English, Tamil and Hindi translations
│   ├── routes/              # File-based pages
│   ├── router.tsx
│   ├── server.ts
│   ├── start.ts
│   └── styles.css
├── supabase/                # Supabase configuration (config.toml)
├── .env.example             # Example environment variables
├── drizzle.config.ts
├── vite.config.ts
├── package.json
└── roadmap.md
```

---

## Getting Started

**Prerequisites:** [Bun](https://bun.sh) and a Supabase project.

1. **Clone the repository**

   ```bash
   git clone https://github.com/SaranyaT2008/tetrix.git
   cd tetrix
   ```

2. **Install dependencies**

   ```bash
   bun install
   ```

3. **Set up environment variables**

   ```bash
   cp .env.example .env
   ```

   Fill in the values described in [Environment Variables](#environment-variables).

4. **Run the development server**

   ```bash
   bun run dev
   ```

   Open the local address shown in the terminal.

**Other scripts**

| Command | Purpose |
|---|---|
| `bun run build` | Production build |
| `bun run preview` | Preview the production build |
| `bun run lint` | Check code with ESLint |
| `bun run format` | Format code with Prettier |

---

## Environment Variables

Copy `.env.example` to `.env` and fill in every value listed there. Typically these cover:

- the Supabase project URL and keys
- the key for the AI service used by the server code

Never commit your `.env` file or share these keys publicly.

---

## Privacy

Medical reports are sensitive. Uploaded reports and results are saved in the database, and each user can see only their own reports. Use only sample or anonymized reports while testing.

---

## Limitations

- Accuracy depends on the quality and clarity of the uploaded report.
- AI extraction and explanations can occasionally be incomplete or wrong, so values should always be checked against the original report.
- Translation quality may vary across Tamil and Hindi.
- Only the ranges printed on the report are used; the app does not apply its own normal ranges.

---

## Future Scope

- More reliable extraction from low-quality or handwritten reports
- Additional regional languages
- Voice output for accessibility
- Trend graphs for values tracked across multiple reports
- Stronger privacy controls and encrypted storage
- Support for prescriptions and imaging reports

---

## Screenshots

**[Add screenshots here: home page and language selection, report upload, explanation of a sample report, highlighted values, doctor questions, Tamil and Hindi output, dashboard.]**

---

## Disclaimer

MediLens AI is an educational and informational tool. It is not a medical device and does not provide medical advice, diagnosis or treatment. Always consult a qualified healthcare professional about your medical results and before making any health decision.
