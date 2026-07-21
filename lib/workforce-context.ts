/**
 * Workforce Context strip — headline labour-market / demographic indicators
 * for the selected country, with Africa benchmarks where useful.
 *
 * Sources: World Bank (demographics bundle) + ILOSTAT (youth employment bundle).
 */

import demographics from "@/lib/data/africa-demographics.json";
import youthIlo from "@/lib/data/youth-employment-ilo.json";
import type { CountryDemographics } from "@/lib/demographics";

type DemoBundle = {
  countries: Record<string, CountryDemographics>;
};

type YouthRow = {
  country: string;
  youthPopulationThousands?: number | null;
  labourForceParticipationPct?: number | null;
  youthUnemploymentPct?: number | null;
  informalEmploymentPct?: number | null;
};

type YouthBundle = {
  africa: YouthRow;
  countries: Record<string, YouthRow>;
};

const DEMO = demographics as DemoBundle;
const YOUTH = youthIlo as YouthBundle;

export type WorkforceIndicator = {
  id: string;
  label: string;
  valueLabel: string;
  compareLabel: string | null;
  tone: "teal" | "amber" | "rose" | "sky" | "violet" | "red";
};

export type WorkforceContextSnapshot = {
  countryLabel: string;
  indicators: WorkforceIndicator[];
  sourceNote: string;
  hasData: boolean;
};

function round1(n: number) {
  return Number(n.toFixed(1));
}

function formatPop(n: number | null | undefined): string | null {
  if (n == null || !Number.isFinite(n) || n <= 0) return null;
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(2)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}K`;
  return String(Math.round(n));
}

function mean(values: number[]) {
  if (values.length === 0) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function africaAverages() {
  const rows = Object.values(DEMO.countries);
  return {
    urbanPct: mean(rows.map((r) => r.urbanPct).filter((v): v is number => v != null)),
    tertiaryEnrollmentPct: mean(
      rows.map((r) => r.tertiaryEnrollmentPct).filter((v): v is number => v != null),
    ),
    youthUnemploymentPct: YOUTH.africa.youthUnemploymentPct ?? null,
    lfprFemalePct: mean(
      rows.map((r) => r.lfprFemalePct).filter((v): v is number => v != null),
    ),
    lfprMalePct: mean(rows.map((r) => r.lfprMalePct).filter((v): v is number => v != null)),
  };
}

function africaAggregateDemo(): CountryDemographics {
  const rows = Object.values(DEMO.countries).filter((c) => c.populationTotal);
  const sum = (key: keyof CountryDemographics) =>
    rows.reduce((acc, r) => acc + (typeof r[key] === "number" ? (r[key] as number) : 0), 0);
  const avg = (key: keyof CountryDemographics) => {
    const vals = rows.map((r) => r[key]).filter((v): v is number => typeof v === "number");
    return mean(vals) ?? undefined;
  };
  return {
    country: "All Countries",
    populationTotal: sum("populationTotal") || undefined,
    age15to64Pct: avg("age15to64Pct"),
    urbanPct: avg("urbanPct"),
    lfprFemalePct: avg("lfprFemalePct"),
    lfprMalePct: avg("lfprMalePct"),
    tertiaryEnrollmentPct: avg("tertiaryEnrollmentPct"),
  };
}

export function getWorkforceContext(country: string): WorkforceContextSnapshot {
  const countryLabel = country === "All Countries" ? "Africa" : country;
  const demo: CountryDemographics =
    country === "All Countries"
      ? africaAggregateDemo()
      : (DEMO.countries[country] ?? { country });
  const youth: YouthRow =
    country === "All Countries"
      ? YOUTH.africa
      : (YOUTH.countries[country] ?? { country });
  const africa = africaAverages();

  const indicators: WorkforceIndicator[] = [];

  const workingAge =
    demo.populationTotal != null && demo.age15to64Pct != null
      ? (demo.populationTotal * demo.age15to64Pct) / 100
      : null;
  if (workingAge != null) {
    indicators.push({
      id: "working-age",
      label: "Working-age population (15–64)",
      valueLabel: formatPop(workingAge) ?? "—",
      compareLabel:
        demo.age15to64Pct != null ? `${round1(demo.age15to64Pct)}% of total` : null,
      tone: "teal",
    });
  }

  const youthPop =
    youth.youthPopulationThousands != null
      ? youth.youthPopulationThousands * 1000
      : null;
  if (youthPop != null) {
    const share =
      demo.populationTotal != null && demo.populationTotal > 0
        ? round1((youthPop / demo.populationTotal) * 100)
        : null;
    indicators.push({
      id: "youth",
      label: "Youth population (15–24)",
      valueLabel: formatPop(youthPop) ?? "—",
      compareLabel: share != null ? `${share}% of total` : null,
      tone: "amber",
    });
  }

  if (demo.lfprFemalePct != null) {
    indicators.push({
      id: "female-lfpr",
      label: "Female labour force participation",
      valueLabel: `${round1(demo.lfprFemalePct)}%`,
      compareLabel:
        demo.lfprMalePct != null ? `vs ${round1(demo.lfprMalePct)}% male` : null,
      tone: "rose",
    });
  }

  if (demo.urbanPct != null) {
    indicators.push({
      id: "urban",
      label: "Urbanization rate",
      valueLabel: `${round1(demo.urbanPct)}%`,
      compareLabel:
        africa.urbanPct != null && country !== "All Countries"
          ? `vs ${round1(africa.urbanPct)}% Africa avg`
          : null,
      tone: "sky",
    });
  }

  if (demo.tertiaryEnrollmentPct != null) {
    indicators.push({
      id: "tertiary",
      label: "Tertiary enrollment",
      valueLabel: `${round1(demo.tertiaryEnrollmentPct)}%`,
      compareLabel:
        africa.tertiaryEnrollmentPct != null && country !== "All Countries"
          ? `vs ${round1(africa.tertiaryEnrollmentPct)}% Africa avg`
          : "Gross enrollment ratio (WB)",
      tone: "violet",
    });
  }

  if (youth.youthUnemploymentPct != null) {
    indicators.push({
      id: "youth-unemp",
      label: "Youth unemployment (15–24)",
      valueLabel: `${round1(youth.youthUnemploymentPct)}%`,
      compareLabel:
        africa.youthUnemploymentPct != null && country !== "All Countries"
          ? `vs ${round1(africa.youthUnemploymentPct)}% Africa avg`
          : null,
      tone: "red",
    });
  }

  return {
    countryLabel,
    indicators,
    sourceNote: "World Bank Open Data · ILOSTAT modelled / LFS estimates",
    hasData: indicators.length > 0,
  };
}
