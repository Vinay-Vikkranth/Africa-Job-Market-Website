/**
 * Curriculum Gap — education-system capacity vs labour-market skill demand.
 *
 * IMPORTANT: No open, structured dataset lists the full school syllabus for every
 * African country as machine-readable skills. True "NUC CCMAS / CAPS / CBC"
 * syllabus parsing is a per-country research project.
 *
 * This metric is a transparent PROXY computed only from real inputs:
 *   curriculumGap ≈ hard-skill demand share (from our job postings)
 *                 − education-pipeline readiness (World Bank enrollment + literacy)
 *
 * When education indicators are missing, gapPct is null — we never invent a readiness score.
 * Refresh education inputs via `npm run build:demographics`.
 */

import type { DemographicsSnapshot } from "@/lib/demographics";
import { categorizeSkill } from "@/lib/skill-categories";

export type CurriculumGapLevel = "Low Gap" | "Moderate Gap" | "High Gap" | "Unavailable";

export type CurriculumGapSnapshot = {
  country: string;
  gapPct: number | null;
  level: CurriculumGapLevel;
  hardSkillDemandPct: number;
  educationReadinessPct: number | null;
  sourceLabel: string;
  methodNote: string;
  sparkData: number[];
  frameworksHint: string | null;
};

/** Well-known national curriculum frameworks (reference only — not parsed). */
const FRAMEWORK_HINTS: Record<string, string> = {
  Nigeria: "NUC CCMAS / NERDC (syllabus not machine-parsed yet)",
  "South Africa": "CAPS / NQF (syllabus not machine-parsed yet)",
  Kenya: "CBC (syllabus not machine-parsed yet)",
  Ghana: "NaCCA standards (syllabus not machine-parsed yet)",
  Egypt: "MoE national curriculum (syllabus not machine-parsed yet)",
  Rwanda: "CBC / REB (syllabus not machine-parsed yet)",
  Ethiopia: "MoE curriculum framework (syllabus not machine-parsed yet)",
  Tanzania: "MoEST syllabi (syllabus not machine-parsed yet)",
  Uganda: "NCDC curriculum (syllabus not machine-parsed yet)",
  Morocco: "MENFP curriculum (syllabus not machine-parsed yet)",
};

function mean(values: number[]) {
  if (values.length === 0) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function levelFor(gap: number | null): CurriculumGapLevel {
  if (gap == null) return "Unavailable";
  if (gap < 25) return "Low Gap";
  if (gap < 45) return "Moderate Gap";
  return "High Gap";
}

/**
 * Education-pipeline readiness (0–100) from World Bank indicators.
 * Returns null when no education indicators exist — never invents a default.
 */
export function educationReadinessPct(demo: DemographicsSnapshot): number | null {
  const parts: number[] = [];
  const { literacyPct, secondaryEnrollmentPct, tertiaryEnrollmentPct, primaryEnrollmentPct } =
    demo.education;

  if (literacyPct != null) parts.push(literacyPct);
  if (secondaryEnrollmentPct != null) parts.push(secondaryEnrollmentPct);
  // Tertiary rates are typically much lower — scale so ~40% ≈ strong pipeline.
  if (tertiaryEnrollmentPct != null) parts.push(clamp(tertiaryEnrollmentPct * 2.5, 0, 100));
  if (primaryEnrollmentPct != null) parts.push(primaryEnrollmentPct);

  const avg = mean(parts);
  return avg == null ? null : Math.round(avg);
}

/** Share of categorized skill demand that is technical or digital (0–100). */
export function hardSkillDemandPct(skillGap: {
  technical: number;
  digital: number;
  soft: number;
  business: number;
}): number {
  const total =
    skillGap.technical + skillGap.digital + skillGap.soft + skillGap.business || 1;
  return Math.round(((skillGap.technical + skillGap.digital) / total) * 100);
}

export function computeCurriculumGapPct(hardDemand: number, readiness: number): number {
  // Education readiness dampens gap; residual is unmet hard-skill pressure.
  return Math.round(clamp(hardDemand - readiness * 0.55, 0, 100));
}

export function getCurriculumGapSnapshot(
  country: string,
  skillGap: { technical: number; digital: number; soft: number; business: number },
  demographics: DemographicsSnapshot,
  weeklyCategoryShares: number[],
): CurriculumGapSnapshot {
  const hardDemand = hardSkillDemandPct(skillGap);
  const readiness = educationReadinessPct(demographics);
  const gapPct = readiness == null ? null : computeCurriculumGapPct(hardDemand, readiness);

  // Sparkline only from real weekly shares — no invented flat series.
  const sparkData =
    readiness == null || weeklyCategoryShares.length === 0
      ? []
      : weeklyCategoryShares.map((share) =>
          computeCurriculumGapPct(Math.max(share, hardDemand * 0.7), readiness),
        );

  const labelCountry = country === "All Countries" ? "Africa" : country;

  return {
    country: labelCountry,
    gapPct,
    level: levelFor(gapPct),
    hardSkillDemandPct: hardDemand,
    educationReadinessPct: readiness,
    sourceLabel: "WB education pipeline · job skill mix",
    methodNote:
      "Proxy: hard-skill job demand minus school/tertiary pipeline readiness. Not a parsed national syllabus.",
    sparkData,
    frameworksHint: FRAMEWORK_HINTS[labelCountry] ?? null,
  };
}

/** Optional helper if callers only have skill names + counts. */
export function hardDemandFromSkillList(skills: { name: string; mentions: number }[]) {
  let hard = 0;
  let total = 0;
  for (const s of skills) {
    total += s.mentions;
    const cat = categorizeSkill(s.name);
    if (cat === "technical" || cat === "digital") hard += s.mentions;
  }
  if (total <= 0) return 0;
  return Math.round((hard / total) * 100);
}
