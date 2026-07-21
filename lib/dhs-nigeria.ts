// Live state-level Nigeria workforce-readiness data from the DHS Program API
// (api.dhsprogram.com) — free, no key required. Backed by the Demographic and
// Health Survey, the same official household survey NBS Nigeria and UN
// agencies use for sub-national statistics.
//
// Metric: secondary-or-higher education attainment, population age 6+,
// combined for both sexes — the closest available proxy for "workforce
// readiness" at the state level. This is a supply-side (population
// education) indicator, not a labor-demand indicator — the app has no
// reliable state-tagged job-posting data for Nigeria to compare it against.

const REVALIDATE_SECONDS = 60 * 60 * 24; // 24h — DHS survey rounds are multi-year

const INDICATOR_COMPLETED_SECONDARY = "ED_EDAT_B_CSC"; // completed secondary education
const INDICATOR_HIGHER = "ED_EDAT_B_HGH"; // attended higher education

// DHS labels state-level rows with a ".." prefix and occasionally a
// different display name than the boundary file — map onto the
// `shapeName` values in public/data/nigeria-states.geojson.
const DHS_TO_SHAPE_NAME: Record<string, string> = {
  "FCT Abuja": "Abuja Federal Capital Territory",
};

type DhsDataRow = {
  IndicatorId: string;
  SurveyYear: number;
  LevelRank: number;
  CharacteristicLabel: string;
  Value: number;
};

export type StateEducationDatum = {
  state: string; // matches nigeria-states.geojson `shapeName`
  value: number; // % of population 6+ with completed secondary education or higher
};

export type NigeriaEducationAttainment = {
  year: number;
  source: string;
  states: StateEducationDatum[];
};

export async function getNigeriaEducationAttainment(): Promise<NigeriaEducationAttainment | null> {
  try {
    const res = await fetch(
      `https://api.dhsprogram.com/rest/dhs/data?countryIds=NG&indicatorIds=${INDICATOR_COMPLETED_SECONDARY},${INDICATOR_HIGHER}&breakdown=subnational&f=json`,
      { next: { revalidate: REVALIDATE_SECONDS } },
    );
    if (!res.ok) return null;
    const json = await res.json();
    const rows: DhsDataRow[] = json?.Data;
    if (!Array.isArray(rows) || rows.length === 0) return null;

    const years = rows.map((r) => r.SurveyYear);
    const latestYear = Math.max(...years);

    const stateRows = rows.filter((r) => r.SurveyYear === latestYear && r.LevelRank === 2);
    const higherByState = new Map(
      stateRows.filter((r) => r.IndicatorId === INDICATOR_HIGHER).map((r) => [r.CharacteristicLabel, r.Value]),
    );

    const states: StateEducationDatum[] = stateRows
      .filter((r) => r.IndicatorId === INDICATOR_COMPLETED_SECONDARY)
      .map((r) => {
        const rawName = r.CharacteristicLabel.replace(/^\.+/, "").trim();
        const shapeName = DHS_TO_SHAPE_NAME[rawName] ?? rawName;
        const higher = higherByState.get(r.CharacteristicLabel) ?? 0;
        return { state: shapeName, value: Number((r.Value + higher).toFixed(1)) };
      });

    if (states.length === 0) return null;

    return { year: latestYear, source: "DHS Program (Demographic and Health Survey)", states };
  } catch {
    return null;
  }
}
