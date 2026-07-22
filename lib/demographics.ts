/**
 * Country demographics for the Workforce Demographics overview card.
 *
 * Population / age / urban / literacy / LFPR / unemployment: World Bank.
 * Youth NEET by sex: ILOSTAT.
 *
 * All figures come from `lib/data/africa-demographics.json` (built via
 * `npm run build:demographics`). Nothing is invented when a country lacks data.
 */

import demographics from "@/lib/data/africa-demographics.json";

export type CountryDemographics = {
  country: string;
  populationTotal?: number;
  populationFemale?: number;
  populationMale?: number;
  populationFemaleSharePct?: number;
  populationMaleSharePct?: number;
  urbanPct?: number;
  ruralPct?: number;
  age0to14Pct?: number;
  age15to64Pct?: number;
  age65PlusPct?: number;
  populationGrowthPct?: number;
  literacyPct?: number;
  literacyFemalePct?: number;
  literacyMalePct?: number;
  lfprFemalePct?: number;
  lfprMalePct?: number;
  unemploymentFemalePct?: number;
  unemploymentMalePct?: number;
  secondaryEnrollmentPct?: number;
  tertiaryEnrollmentPct?: number;
  primaryEnrollmentPct?: number;
  neetPct?: number;
  neetFemalePct?: number;
  neetMalePct?: number;
  [key: string]: string | number | undefined;
};

type Bundle = {
  generatedAt: string;
  sources: string[];
  countries: Record<string, CountryDemographics>;
};

const BUNDLE = demographics as Bundle;

/** Gender comparison on a rate using both real values. */
export type DemographicGap = {
  label: string;
  femalePct: number;
  malePct: number;
  /** Absolute difference |female − male|, for sorting. */
  absDiffPct: number;
  /** Plain-language outcome for women relative to men. */
  plainSummary: string;
};

export type GenderSide = {
  label: string;
  ageLabel: string;
  populationLabel: string | null;
  populationSharePct: number | null;
  literacyPct: number | null;
  lfprPct: number | null;
  unemploymentPct: number | null;
  neetPct: number | null;
};

export type DemographicsSnapshot = {
  country: string;
  hasData: boolean;
  /** Mean absolute gender difference across available indicators (%). */
  overallGapPct: number | null;
  female: GenderSide;
  male: GenderSide;
  /** Gender comparisons with both rates and plain-language summary. */
  genderDiffs: DemographicGap[];
  ageGroups: { name: string; pct: number | null }[];
  education: {
    literacyPct: number | null;
    literacyFemalePct: number | null;
    literacyMalePct: number | null;
    primaryEnrollmentPct: number | null;
    secondaryEnrollmentPct: number | null;
    tertiaryEnrollmentPct: number | null;
  };
  urbanRural: {
    urbanPct: number | null;
    ruralPct: number | null;
    populationGrowthPct: number | null;
  };
  sourceNote: string;
};

function formatPop(n: number | null | undefined): string | null {
  if (n == null || !Number.isFinite(n) || n <= 0) return null;
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(2)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return String(Math.round(n));
}

function round1(n: number | null | undefined): number | null {
  if (n == null || !Number.isFinite(n)) return null;
  return Number(n.toFixed(1));
}

/** Female vs male rates where both sexes have real data. */
function genderDiffs(row: CountryDemographics): DemographicGap[] {
  const diffs: DemographicGap[] = [];

  if (row.literacyFemalePct != null && row.literacyMalePct != null) {
    const f = Number(row.literacyFemalePct.toFixed(1));
    const m = Number(row.literacyMalePct.toFixed(1));
    const abs = Number(Math.abs(f - m).toFixed(1));
    diffs.push({
      label: "Adult literacy",
      femalePct: f,
      malePct: m,
      absDiffPct: abs,
      plainSummary:
        f < m
          ? `Women ${f}% · Men ${m}% — women are ${abs}% lower`
          : f > m
            ? `Women ${f}% · Men ${m}% — women are ${abs}% higher`
            : `Women and men both ${f}%`,
    });
  }

  if (row.lfprFemalePct != null && row.lfprMalePct != null) {
    const f = Number(row.lfprFemalePct.toFixed(1));
    const m = Number(row.lfprMalePct.toFixed(1));
    const abs = Number(Math.abs(f - m).toFixed(1));
    diffs.push({
      label: "Labour force participation",
      femalePct: f,
      malePct: m,
      absDiffPct: abs,
      plainSummary:
        f < m
          ? `Women ${f}% · Men ${m}% — women are ${abs}% lower`
          : f > m
            ? `Women ${f}% · Men ${m}% — women are ${abs}% higher`
            : `Women and men both ${f}%`,
    });
  }

  if (row.unemploymentFemalePct != null && row.unemploymentMalePct != null) {
    const f = Number(row.unemploymentFemalePct.toFixed(1));
    const m = Number(row.unemploymentMalePct.toFixed(1));
    const abs = Number(Math.abs(f - m).toFixed(1));
    diffs.push({
      label: "Unemployment",
      femalePct: f,
      malePct: m,
      absDiffPct: abs,
      plainSummary:
        f > m
          ? `Women ${f}% · Men ${m}% — ${abs}% higher for women (worse)`
          : f < m
            ? `Women ${f}% · Men ${m}% — ${abs}% higher for men (worse)`
            : `Women and men both ${f}%`,
    });
  }

  if (row.neetFemalePct != null && row.neetMalePct != null) {
    const f = Number(row.neetFemalePct.toFixed(1));
    const m = Number(row.neetMalePct.toFixed(1));
    const abs = Number(Math.abs(f - m).toFixed(1));
    diffs.push({
      label: "Youth NEET",
      femalePct: f,
      malePct: m,
      absDiffPct: abs,
      plainSummary:
        f > m
          ? `Women ${f}% · Men ${m}% — ${abs}% higher for women (worse)`
          : f < m
            ? `Women ${f}% · Men ${m}% — ${abs}% higher for men (worse)`
            : `Women and men both ${f}%`,
    });
  }

  return diffs.sort((a, b) => b.absDiffPct - a.absDiffPct);
}

function overallGap(row: CountryDemographics): number | null {
  const parts: number[] = [];
  if (row.literacyFemalePct != null && row.literacyMalePct != null) {
    parts.push(Math.abs(row.literacyMalePct - row.literacyFemalePct));
  }
  if (row.lfprFemalePct != null && row.lfprMalePct != null) {
    parts.push(Math.abs(row.lfprMalePct - row.lfprFemalePct));
  }
  if (row.unemploymentFemalePct != null && row.unemploymentMalePct != null) {
    parts.push(Math.abs(row.unemploymentFemalePct - row.unemploymentMalePct));
  }
  if (row.neetFemalePct != null && row.neetMalePct != null) {
    parts.push(Math.abs(row.neetFemalePct - row.neetMalePct));
  }
  if (parts.length === 0) return null;
  return Math.round(parts.reduce((a, b) => a + b, 0) / parts.length);
}

function emptySide(label: string): GenderSide {
  return {
    label,
    ageLabel: "15+",
    populationLabel: null,
    populationSharePct: null,
    literacyPct: null,
    lfprPct: null,
    unemploymentPct: null,
    neetPct: null,
  };
}

function africaAggregate(): CountryDemographics {
  const rows = Object.values(BUNDLE.countries).filter((c) => c.populationTotal);
  const sum = (key: keyof CountryDemographics) =>
    rows.reduce((acc, r) => acc + (typeof r[key] === "number" ? (r[key] as number) : 0), 0);
  const mean = (key: keyof CountryDemographics) => {
    const vals = rows
      .map((r) => r[key])
      .filter((v): v is number => typeof v === "number");
    if (vals.length === 0) return undefined;
    return vals.reduce((a, b) => a + b, 0) / vals.length;
  };

  const female = sum("populationFemale");
  const male = sum("populationMale");
  const total = female + male || sum("populationTotal");

  return {
    country: "All Countries",
    populationTotal: total || undefined,
    populationFemale: female || undefined,
    populationMale: male || undefined,
    populationFemaleSharePct: total ? (female / total) * 100 : undefined,
    populationMaleSharePct: total ? (male / total) * 100 : undefined,
    urbanPct: mean("urbanPct"),
    ruralPct: mean("ruralPct"),
    age0to14Pct: mean("age0to14Pct"),
    age15to64Pct: mean("age15to64Pct"),
    age65PlusPct: mean("age65PlusPct"),
    populationGrowthPct: mean("populationGrowthPct"),
    literacyPct: mean("literacyPct"),
    literacyFemalePct: mean("literacyFemalePct"),
    literacyMalePct: mean("literacyMalePct"),
    lfprFemalePct: mean("lfprFemalePct"),
    lfprMalePct: mean("lfprMalePct"),
    unemploymentFemalePct: mean("unemploymentFemalePct"),
    unemploymentMalePct: mean("unemploymentMalePct"),
    secondaryEnrollmentPct: mean("secondaryEnrollmentPct"),
    tertiaryEnrollmentPct: mean("tertiaryEnrollmentPct"),
    primaryEnrollmentPct: mean("primaryEnrollmentPct"),
    neetPct: mean("neetPct"),
    neetFemalePct: mean("neetFemalePct"),
    neetMalePct: mean("neetMalePct"),
  };
}

export function getDemographicsSnapshot(country: string): DemographicsSnapshot {
  const row: CountryDemographics =
    country === "All Countries"
      ? africaAggregate()
      : (BUNDLE.countries[country] ?? { country });

  const hasData = Boolean(
    row.populationTotal ||
      row.urbanPct != null ||
      row.literacyPct != null ||
      row.lfprFemalePct != null,
  );

  const female: GenderSide = {
    label: "Female",
    ageLabel: "15+",
    populationLabel: formatPop(row.populationFemale),
    populationSharePct: round1(row.populationFemaleSharePct),
    literacyPct: round1(row.literacyFemalePct),
    lfprPct: round1(row.lfprFemalePct),
    unemploymentPct: round1(row.unemploymentFemalePct),
    neetPct: round1(row.neetFemalePct),
  };

  const male: GenderSide = {
    label: "Male",
    ageLabel: "15+",
    populationLabel: formatPop(row.populationMale),
    populationSharePct: round1(row.populationMaleSharePct),
    literacyPct: round1(row.literacyMalePct),
    lfprPct: round1(row.lfprMalePct),
    unemploymentPct: round1(row.unemploymentMalePct),
    neetPct: round1(row.neetMalePct),
  };

  const sourceNote = `World Bank Open Data · ILOSTAT NEET · updated ${BUNDLE.generatedAt.slice(0, 10)}`;

  if (!hasData) {
    return {
      country,
      hasData: false,
      overallGapPct: null,
      female: emptySide("Female"),
      male: emptySide("Male"),
      genderDiffs: [],
      ageGroups: [],
      education: {
        literacyPct: null,
        literacyFemalePct: null,
        literacyMalePct: null,
        primaryEnrollmentPct: null,
        secondaryEnrollmentPct: null,
        tertiaryEnrollmentPct: null,
      },
      urbanRural: { urbanPct: null, ruralPct: null, populationGrowthPct: null },
      sourceNote,
    };
  }

  return {
    country: country === "All Countries" ? "Africa" : country,
    hasData: true,
    overallGapPct: overallGap(row),
    female,
    male,
    genderDiffs: genderDiffs(row),
    ageGroups: [
      { name: "0–14", pct: round1(row.age0to14Pct) },
      { name: "15–64", pct: round1(row.age15to64Pct) },
      { name: "65+", pct: round1(row.age65PlusPct) },
    ],
    education: {
      literacyPct: round1(row.literacyPct),
      literacyFemalePct: round1(row.literacyFemalePct),
      literacyMalePct: round1(row.literacyMalePct),
      primaryEnrollmentPct: round1(row.primaryEnrollmentPct),
      secondaryEnrollmentPct: round1(row.secondaryEnrollmentPct),
      tertiaryEnrollmentPct: round1(row.tertiaryEnrollmentPct),
    },
    urbanRural: {
      urbanPct: round1(row.urbanPct),
      ruralPct: round1(row.ruralPct),
      populationGrowthPct: round1(row.populationGrowthPct),
    },
    sourceNote,
  };
}
