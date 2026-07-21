/**
 * Canonical catalogue of every external / internal data source used by the app.
 * Powered cards link here via `/sources#id` so anyone can verify provenance.
 */

export type DataSourceEntry = {
  id: string;
  title: string;
  kind: "jobs" | "labour" | "education" | "geography" | "derived";
  summary: string;
  /** What the user sees that depends on this source */
  powers: string[];
  /** Public docs / API / dataset URL for verification */
  verifyUrl: string;
  verifyLabel: string;
  /** How we refresh the local bundle / DB */
  refresh: string;
  /** Honest caveat when the metric is computed, not raw */
  caveat?: string;
};

export const DATA_SOURCES: DataSourceEntry[] = [
  {
    id: "job-boards",
    title: "African & global job boards",
    kind: "jobs",
    summary:
      "Live job postings ingested into our SQLite database from Freehire, MyJobMag, Jobberman, BrighterMonday, Adzuna, Jooble, RemoteOK, ReliefWeb, UN Careers, UNDP, UN Women, and related feeds. Skills and salaries are extracted from posting text — not invented.",
    powers: [
      "Total jobs, companies, skills KPIs",
      "Map / regional job counts",
      "Top in-demand skills",
      "Skill Gaps & Demand vs Supply",
      "Salary Insights",
      "Alerts & insights",
    ],
    verifyUrl: "/jobs",
    verifyLabel: "Open Jobs Overview",
    refresh: "npm run sync  (or Sync Data in the header)",
  },
  {
    id: "world-bank",
    title: "World Bank Open Data",
    kind: "labour",
    summary:
      "Official country indicators via the World Bank Indicators API: population by sex, age structure, urbanisation, literacy, labour-force participation, unemployment, and school enrollment. Bundled locally so the dashboard stays fast and auditable.",
    powers: [
      "Workforce Demographics (Gender / Age / Education / Urban)",
      "Workforce Context strip",
      "Curriculum Gap education-readiness input",
    ],
    verifyUrl: "https://data.worldbank.org/indicator",
    verifyLabel: "Open World Bank Indicators",
    refresh: "npm run build:demographics",
  },
  {
    id: "ilostat",
    title: "ILOSTAT (ILO)",
    kind: "labour",
    summary:
      "International Labour Organization statistics: youth population (15–24), youth labour-force participation, youth unemployment, informal employment, and youth NEET by sex. Fetched from the ILOSTAT SDMX / rplumber API and stored in a versioned JSON bundle.",
    powers: [
      "Youth Employment Snapshot",
      "Workforce Context (youth population & youth unemployment)",
      "Workforce Demographics (Youth NEET by sex)",
    ],
    verifyUrl: "https://ilostat.ilo.org/",
    verifyLabel: "Open ILOSTAT",
    refresh: "npm run build:youth  ·  npm run build:demographics",
  },
  {
    id: "natural-earth",
    title: "Natural Earth administrative boundaries",
    kind: "geography",
    summary:
      "ADM1 (state/province) polygons for African countries, used only for the regional map shapes. Job counts on those regions come from our job database, mapped by city name — not from Natural Earth.",
    powers: ["Regional map drill-down shapes"],
    verifyUrl: "https://www.naturalearthdata.com/",
    verifyLabel: "Natural Earth Data",
    refresh: "npm run build:regions",
  },
  {
    id: "nuc-syllabus",
    title: "Nigeria NUC CCMAS 2022 (parsed syllabus)",
    kind: "education",
    summary:
      "National Universities Commission Core Curriculum and Minimum Academic Standards for seven B.Sc. computing programmes (CS, Cybersecurity, Data Science, ICT, IS, IT, Software Engineering). Skills are mapped to job-market terms and compared against top skills from Nigeria job postings.",
    powers: [
      "Curriculum Gap Analysis on Skill Mix (Nigeria only)",
      "Curriculum Gap card on Overview (replaces proxy when Nigeria is selected)",
    ],
    verifyUrl: "https://www.nuc.edu.ng/",
    verifyLabel: "National Universities Commission",
    refresh: "Static mapping in lib/syllabus-data.ts — extend for more countries as syllabi are parsed",
    caveat:
      "Matching uses keyword overlap between syllabus skill terms and extracted job-posting skills. It is a structured comparison, not a full document parse of every course module.",
  },
  {
    id: "curriculum-proxy",
    title: "Curriculum Gap (computed proxy)",
    kind: "derived",
    summary:
      "For countries without a parsed syllabus on file, this KPI uses a transparent formula: hard-skill share in our job postings minus World Bank education-pipeline readiness. It is not a parsed NUC CCMAS / CAPS / CBC document.",
    powers: ["Curriculum Gap KPI on Overview (when no parsed syllabus exists)"],
    verifyUrl: "https://data.worldbank.org/indicator",
    verifyLabel: "Verify education inputs (World Bank)",
    refresh: "Uses latest job DB + demographics bundle",
    caveat:
      "If education indicators are missing for a country, the gap shows as unavailable — we do not invent a readiness score.",
  },
];

export function getDataSource(id: string) {
  return DATA_SOURCES.find((s) => s.id === id);
}

/** Glossary for terms shown on demographic cards */
export const METRIC_GLOSSARY = {
  lfpr: {
    term: "Labour force participation",
    meaning:
      "Share of the working-age population that is either employed or actively looking for work. A lower rate for women means fewer women are in (or seeking) paid work — not a negative literacy score.",
  },
  literacy: {
    term: "Adult literacy",
    meaning:
      "Share of adults who can read and write. When we say women are lower than men, we compare the two rates (e.g. 60% vs 75%), using real World Bank figures.",
  },
  neet: {
    term: "Youth NEET",
    meaning:
      "NEET = Not in Employment, Education or Training. It is the share of young people (usually 15–24) who are neither working, studying, nor in training. Higher NEET is worse.",
  },
  unemployment: {
    term: "Unemployment rate",
    meaning:
      "Share of the labour force that is without work but available and seeking work. Higher unemployment is worse.",
  },
} as const;
