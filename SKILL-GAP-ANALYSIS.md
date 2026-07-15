# Skill Gap Analysis — Development Log

This document summarises every change made to the Africa Job Market Dashboard in this development cycle.

---

## 1. Bug Fixes

### 1.1 — 404 Errors on `/jobs`, `/skills`, `/reports` Routes

**Problem**  
Next.js 16 ships with Turbopack as the default bundler. `@prisma/client` (uses a WASM query compiler) and `better-sqlite3` (uses a native `.node` binary) cannot be bundled by Turbopack — when they are, module initialisation fails and Next.js surfaces the error as a 404 on any page that imports them.

**Fix — `next.config.ts`**  
Added `@prisma/client` and `better-sqlite3` to `serverExternalPackages` so Turbopack skips bundling them and lets Node.js load them at runtime instead.

```ts
// next.config.ts
const nextConfig: NextConfig = {
  serverExternalPackages: ["pdfkit", "@prisma/client", "better-sqlite3"],
};
```

---

### 1.2 — ESLint Unused-Variable Warnings

| File | Change |
|---|---|
| `lib/analytics.ts` line 70 | Renamed map index `i` → `_i` (never used inside the callback) |
| `lib/dashboard-data.ts` line 30 | Renamed parameter `totalJobs` → `_totalJobs` (declared but never referenced) |
| `lib/sync-jobs.ts` line 1 | Removed unused `import { prisma }` — all DB calls in this file go through `upsertIngestedJob` |

---

## 2. Nigeria Curriculum-Based Skill Gap Analysis

### Overview

The new feature compares **what Nigeria's universities teach** (supply) against **what Nigerian employers actually demand** (demand from live job postings in the database).

**Data source — supply side:** Nigeria National Universities Commission  
*Core Curriculum and Minimum Academic Standards for Computing & ICT Programmes (NUC CCMAS 2022)*

**Data source — demand side:** Live job postings scraped from African job boards (256 Nigerian postings in the current dataset).

---

### 2.1 — `lib/syllabus-data.ts` *(new file)*

Stores the curriculum as structured data. Each entry lists:
- A human-readable skill name (e.g. `"Machine Learning & AI"`)
- Lowercase terms used for matching against job-market skill names (e.g. `["machine learning", "artificial intelligence", "ai/ml"]`)
- Which of the 7 programmes teaches it

**Programmes covered (Nigeria CCMAS 2022):**
1. Computer Science
2. Cybersecurity
3. Data Science
4. ICT
5. Information Systems
6. Information Technology
7. Software Engineering

**Curriculum skills encoded (19 skill clusters):**

| Cluster | Covered Terms | Programmes |
|---|---|---|
| Communication | communication | All 7 |
| Teamwork & Collaboration | teamwork, collaboration, team | All 7 |
| Critical Thinking & Problem Solving | critical thinking, problem solving | All 7 |
| Leadership & Organisation | leadership, organisation, organization | CS, ICT, IS, IT, SE |
| Project Management | project management | CS, IS, SE |
| Research & Digital Literacy | research, digital literacy | Data Science |
| Cybersecurity & Network Defense | cybersecurity, infosec, network security, firewall | Cybersecurity, IS |
| Vulnerability Assessment | vulnerability assessment, penetration testing, threat modeling | Cybersecurity |
| Systems Administration | sys admin, systems administration | Cybersecurity, ICT |
| Automation & Scripting | automation, scripting | Cybersecurity, SE |
| Data Analysis & Statistics | data analysis, analytics, statistics | Data Science, IS |
| Machine Learning & AI | machine learning, artificial intelligence, ai/ml | Data Science |
| Database Design & SQL | sql, database | IS, Data Science |
| Cloud Platforms | cloud computing, cloud platform | Cybersecurity, ICT |
| Networking & ICT Infrastructure | networking, ict | Cybersecurity, ICT, IT |
| Python / Scripting | python | Data Science, Cybersecurity, CS |
| Software Engineering & Testing | software engineering, testing, ci/cd, agile, scrum, devops | SE, CS |
| Business Strategy | business strategy, business analysis | IS |
| Analyst Roles | analyst | Data Science, IS |

The structure is country-keyed (`COUNTRY_SYLLABUSES["Nigeria"]`) so additional countries can be added by appending a new entry when their syllabuses become available.

---

### 2.2 — `lib/analytics.ts` — `getSyllabusGap()` *(new function)*

```
getSyllabusGap(country: string, where: Record<string, unknown>)
  → Promise<SyllabusGapResult | null>
```

**Algorithm:**
1. Look up the country's syllabus in `COUNTRY_SYLLABUSES`. Return `null` if none exists.
2. Fetch the top 50 skills from job postings filtered by country.
3. For each skill, call `findCurriculumMatch()` — a bidirectional case-insensitive substring check against all terms in the syllabus.
4. Split results into `coveredSkills` and `gapSkills`.
5. Calculate `coverageRate` and `gapRate` weighted by mention count (not just skill count).

**Return shape:**
```ts
{
  country: string;
  source: string;           // "NUC CCMAS 2022"
  programs: string[];       // the 7 programmes
  coverageRate: number;     // % of job-mention volume covered by curriculum
  gapRate: number;          // % NOT covered  (= 100 - coverageRate)
  coveredSkills: { skill, mentions, curriculumSkill }[];
  gapSkills: { skill, mentions }[];
  totalMentions: number;
  coveredMentions: number;
}
```

---

### 2.3 — `lib/dashboard-data.ts` — Wiring into the Main Data Pipeline

`getSyllabusGap` is called inside the existing `Promise.all` in `getDashboardData()` only when `hasSyllabus(country)` returns true. For all other countries the value is `null` and nothing changes.

```ts
hasSyllabus(country) ? getSyllabusGap(country, where) : Promise.resolve(null),
```

The result is returned as `syllabusGap` alongside the existing `skillGap`, `emergingTechnologies`, etc.

The main dashboard KPI is also updated:
- `overallGapPct` → uses `syllabusGap.gapRate` when available (curriculum gap), falls back to the existing category-distribution score otherwise
- `gapChangePct` → set to `0` for syllabus-based views (no prior-period comparison exists for curriculum data)

---

### 2.4 — `app/components/gaps-content.tsx` — Curriculum Analysis UI

When `data.syllabusGap` is non-null a new section appears **above** the existing charts on the `/gaps` page:

**KPI row (3 cards):**
| Card | Shows |
|---|---|
| Curriculum Coverage | `coverageRate %` with a green progress bar |
| Curriculum Gap | `gapRate %` with a red progress bar |
| Skills Analysed | count of covered + gap skills |

**Charts:**
- **Gap skills bar chart (red)** — top 10 demanded skills NOT in the curriculum, horizontal bars ordered by mention count
- **Covered skills bar chart (green)** — top 10 demanded skills that ARE in the curriculum

**Priority gap table:**  
All gap skills with their mention count, "Not covered" badge, and a demand-share mini-bar showing each skill's share of total mentions.

The existing Skill Category Distribution pie chart and Demand vs Supply bar chart remain below, unchanged.

---

### 2.5 — `app/components/overview-content.tsx` — Main Dashboard KPI Card

When Nigeria (or any future country with syllabus data) is selected:

| Element | Before | After |
|---|---|---|
| Card title | "Skill Gap (Overall)" | "Curriculum Gap — Nigeria" |
| Value | Category-distribution score | `gapRate` from curriculum analysis |
| Sub-label | "vs previous period" | "NUC CCMAS 2022" |
| Pie chart centre label | "Overall Gap" | "Curriculum Gap" |
| Pie chart centre value | category score | curriculum `gapRate` |

For all other countries the card is unchanged.

---

## 3. Key Findings for Nigeria (Current Dataset)

Based on 256 Nigerian job postings and the NUC CCMAS 2022 curriculum:

**Top skills demanded but NOT in the curriculum:**

| Rank | Skill | Mentions |
|---|---|---|
| 1 | Excel | 97 |
| 2 | Digital Marketing | 75 |
| 3 | Customer Support | 75 |
| 4 | Marketing | 58 |
| 5 | Design | 45 |
| 6 | Finance | 26 |
| 7 | Consulting | 24 |
| 8 | Power BI | 9 |
| 9 | React | 11 |
| 10 | Salesforce | 10 |

**Interpretation:** The curriculum covers the core computing fundamentals (cybersecurity, data analysis, machine learning, SQL, Python, testing) well, but the job market has significant demand for business productivity tools (Excel, Power BI), digital marketing, customer-facing roles, and specific modern frameworks (React, Salesforce) that are absent from the academic programmes.

---

## 4. Architecture — How to Add More Countries

When a new country's syllabus becomes available:

1. Open `lib/syllabus-data.ts`
2. Add a new entry to `COUNTRY_SYLLABUSES`:

```ts
COUNTRY_SYLLABUSES["Kenya"] = {
  country: "Kenya",
  source: "Kenya Accreditation Source 2023",
  programs: ["Computer Science", "Software Engineering", ...],
  skills: [
    {
      name: "Communication",
      terms: ["communication"],
      programs: ["Computer Science", ...],
    },
    // ... more skills
  ],
};
```

No other files need to change. The rest of the pipeline picks up the new entry automatically via `hasSyllabus()`.

---

## 5. Files Changed

| File | Type | Summary |
|---|---|---|
| `next.config.ts` | Modified | Add `@prisma/client`, `better-sqlite3` to `serverExternalPackages` |
| `lib/syllabus-data.ts` | **New** | Nigeria CCMAS 2022 curriculum data + matching helpers |
| `lib/analytics.ts` | Modified | Add `getSyllabusGap()` + `SyllabusGapResult` type; fix unused `_i` |
| `lib/dashboard-data.ts` | Modified | Wire `syllabusGap` into `getDashboardData()`; update `overallGapPct` + `gapChangePct` |
| `lib/sync-jobs.ts` | Modified | Remove unused `prisma` import |
| `app/components/gaps-content.tsx` | Modified | Add curriculum gap analysis section (KPI cards, bar charts, table) |
| `app/components/overview-content.tsx` | Modified | Update Skill Gap KPI card to reflect curriculum gap for Nigeria |
| `public/data/computing_skills_inventory.pdf` | **New** | Nigeria NUC CCMAS 2022 source PDF |
