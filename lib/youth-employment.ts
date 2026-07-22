/**
 * Youth employment snapshot for the overview card.
 *
 * Labour-market indicators come from ILOSTAT (bundled via
 * `scripts/build-youth-employment.mjs`). Top missing skills come from our
 * job-posting skill demand for the active country filter.
 */

import youthIlo from "@/lib/data/youth-employment-ilo.json";

export type YouthIloCountry = {
  country: string;
  youthPopulationThousands?: number | null;
  youthPopulationThousandsYear?: number;
  labourForceParticipationPct?: number | null;
  labourForceParticipationPctYear?: number;
  neetPct?: number | null;
  neetPctYear?: number;
  youthUnemploymentPct?: number | null;
  youthUnemploymentPctYear?: number;
  informalEmploymentPct?: number | null;
  informalEmploymentPctYear?: number;
  source?: string;
};

type YouthIloBundle = {
  generatedAt: string;
  source: string;
  ageGroup: string;
  africa: YouthIloCountry;
  countries: Record<string, YouthIloCountry>;
};

const BUNDLE = youthIlo as YouthIloBundle;

export type YouthEmploymentSnapshot = {
  countryLabel: string;
  ageGroup: string;
  youthPopulationLabel: string | null;
  labourForceParticipationPct: number | null;
  neetPct: number | null;
  youthUnemploymentPct: number | null;
  informalEmploymentPct: number | null;
  topDemandSkills: string[];
  sourceNote: string;
  yearNote: string;
  /** ILOSTAT series / survey label when available */
  iloSeriesNote: string | null;
  generatedAt: string;
};

function formatPopulation(thousands: number | null | undefined): string | null {
  if (thousands == null || !Number.isFinite(thousands) || thousands <= 0) return null;
  const millions = thousands / 1000;
  if (millions >= 10) return `${millions.toFixed(1)}M`;
  if (millions >= 1) return `${millions.toFixed(1)}M`;
  if (thousands >= 1) return `${Math.round(thousands).toLocaleString()}K`;
  return null;
}

function collectYears(row: YouthIloCountry): number[] {
  return [
    row.youthPopulationThousandsYear,
    row.labourForceParticipationPctYear,
    row.neetPctYear,
    row.youthUnemploymentPctYear,
    row.informalEmploymentPctYear,
  ].filter((y): y is number => typeof y === "number");
}

export function getYouthEmploymentSnapshot(
  country: string,
  topSkills: { name: string }[],
): YouthEmploymentSnapshot {
  const row: YouthIloCountry =
    country === "All Countries"
      ? BUNDLE.africa
      : (BUNDLE.countries[country] ?? { country });

  const years = collectYears(row);
  const yearNote =
    years.length === 0
      ? "ILOSTAT"
      : years.every((y) => y === years[0])
        ? `ILOSTAT ${years[0]}`
        : `ILOSTAT ${Math.min(...years)}–${Math.max(...years)}`;

  return {
    countryLabel: country === "All Countries" ? "Africa" : country,
    ageGroup: BUNDLE.ageGroup,
    youthPopulationLabel: formatPopulation(row.youthPopulationThousands),
    labourForceParticipationPct:
      row.labourForceParticipationPct != null
        ? Math.round(row.labourForceParticipationPct)
        : null,
    neetPct: row.neetPct != null ? Math.round(row.neetPct) : null,
    youthUnemploymentPct:
      row.youthUnemploymentPct != null ? Math.round(row.youthUnemploymentPct) : null,
    informalEmploymentPct:
      row.informalEmploymentPct != null ? Math.round(row.informalEmploymentPct) : null,
    topDemandSkills: topSkills.slice(0, 3).map((s) => s.name),
    sourceNote: `${yearNote} · skills from job postings`,
    yearNote,
    iloSeriesNote: row.source ?? BUNDLE.source ?? null,
    generatedAt: BUNDLE.generatedAt,
  };
}
