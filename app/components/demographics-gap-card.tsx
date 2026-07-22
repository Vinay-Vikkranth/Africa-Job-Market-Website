"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Info, Mars, Venus } from "lucide-react";
import type { DemographicGap, DemographicsSnapshot } from "@/lib/demographics";
import { DataSourceButton } from "@/app/components/data-source-button";
import { METRIC_GLOSSARY } from "@/lib/data-sources";

const TABS = [
  { id: "gender", label: "Gender" },
  { id: "age", label: "Age Group" },
  { id: "education", label: "Education Level" },
  { id: "urban", label: "Urban vs Rural" },
] as const;

type TabId = (typeof TABS)[number]["id"];

const AGE_COLORS = ["#93c5fd", "#3b82f6", "#1e3a8a"];
const URBAN_COLORS = ["#0ea5e9", "#64748b"];
const WOMEN = "#f43f5e";
const MEN = "#0ea5e9";

function fmtPct(n: number | null | undefined) {
  return n == null ? "—" : `${n}%`;
}

function shortMetricName(label: string) {
  if (label === "Labour force participation") return "Labour force";
  if (label === "Adult literacy") return "Literacy";
  if (label === "Youth NEET") return "Youth NEET";
  return label;
}

function gapHint(label: string) {
  if (label === "Adult literacy") return METRIC_GLOSSARY.literacy.meaning;
  if (label === "Labour force participation") return METRIC_GLOSSARY.lfpr.meaning;
  if (label === "Unemployment") return METRIC_GLOSSARY.unemployment.meaning;
  if (label === "Youth NEET") return METRIC_GLOSSARY.neet.meaning;
  return undefined;
}

/** Compact headcount pie — women vs men share of population. */
function PopulationSplit({ snapshot }: { snapshot: DemographicsSnapshot }) {
  const fShare = snapshot.female.populationSharePct;
  const mShare = snapshot.male.populationSharePct;
  const pieData = [
    {
      name: "Women",
      value: fShare ?? 0,
      count: snapshot.female.populationLabel ?? "—",
      fill: WOMEN,
    },
    {
      name: "Men",
      value: mShare ?? 0,
      count: snapshot.male.populationLabel ?? "—",
      fill: MEN,
    },
  ].filter((d) => d.value > 0);

  if (pieData.length === 0) {
    return (
      <div className="flex items-center justify-center rounded-2xl border border-slate-100 bg-slate-50/50 p-6 text-sm text-slate-500">
        Population share unavailable
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center rounded-2xl border border-slate-100 bg-slate-50/50 p-4">
      <p className="mb-1 self-start text-sm font-semibold text-slate-900">Population 15+</p>
      <div className="relative h-52 w-full max-w-[220px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={pieData}
              dataKey="value"
              nameKey="name"
              innerRadius={52}
              outerRadius={78}
              paddingAngle={2}
              stroke="none"
            >
              {pieData.map((d) => (
                <Cell key={d.name} fill={d.fill} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value, name, item) => {
                const count = (item?.payload as { count?: string } | undefined)?.count;
                return [`${value ?? 0}%${count ? ` · ${count}` : ""}`, String(name)];
              }}
              contentStyle={{ borderRadius: 10, border: "1px solid #e2e8f0", fontSize: 12 }}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
            Total
          </span>
          <span className="text-sm font-bold tabular-nums text-slate-800">
            {[snapshot.female.populationLabel, snapshot.male.populationLabel]
              .filter(Boolean)
              .length === 2
              ? "≈100%"
              : "—"}
          </span>
        </div>
      </div>
      <div className="mt-1 flex w-full justify-center gap-5">
        {pieData.map((d) => (
          <div key={d.name} className="flex items-center gap-2">
            <span
              className="flex h-7 w-7 items-center justify-center rounded-full bg-white shadow-sm"
              style={{ color: d.fill }}
            >
              {d.name === "Women" ? <Venus className="h-3.5 w-3.5" /> : <Mars className="h-3.5 w-3.5" />}
            </span>
            <div>
              <p className="text-sm font-bold tabular-nums leading-none text-slate-900">{d.count}</p>
              <p className="mt-0.5 text-[11px] tabular-nums" style={{ color: d.fill }}>
                {d.value}%
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function GenderCompareChart({ gaps }: { gaps: DemographicGap[] }) {
  const data = gaps.map((g) => ({
    name: shortMetricName(g.label),
    fullLabel: g.label,
    women: g.femalePct,
    men: g.malePct,
    gap: g.absDiffPct,
    hint: gapHint(g.label),
  }));

  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-slate-900">Women vs men</p>
        <div className="flex items-center gap-3 text-[11px] font-medium text-slate-500">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: WOMEN }} />
            Women
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: MEN }} />
            Men
          </span>
        </div>
      </div>

      <div className="h-72 w-full sm:h-80">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 4, right: 48, left: 4, bottom: 4 }}
            barCategoryGap="18%"
            barGap={4}
          >
            <XAxis
              type="number"
              domain={[0, 100]}
              tick={{ fontSize: 11, fill: "#94a3b8" }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => `${v}%`}
            />
            <YAxis
              type="category"
              dataKey="name"
              width={88}
              tick={{ fontSize: 12, fill: "#475569" }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              cursor={{ fill: "#f8fafc" }}
              contentStyle={{ borderRadius: 10, border: "1px solid #e2e8f0", fontSize: 12 }}
              formatter={(value, name) => [
                `${value ?? 0}%`,
                name === "women" ? "Women" : "Men",
              ]}
              labelFormatter={(_, payload) => {
                const row = payload?.[0]?.payload as { fullLabel?: string; hint?: string } | undefined;
                return row?.fullLabel ?? "";
              }}
            />
            <Bar dataKey="women" name="women" fill={WOMEN} radius={[0, 6, 6, 0]} barSize={14} />
            <Bar dataKey="men" name="men" fill={MEN} radius={[0, 6, 6, 0]} barSize={14} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Visual gap chips under the chart — short, no paragraphs */}
      <div className="mt-2 flex flex-wrap gap-2">
        {gaps.map((g) => {
          const worseWhenHigher = g.label === "Unemployment" || g.label === "Youth NEET";
          const womenWorse = worseWhenHigher
            ? g.femalePct > g.malePct
            : g.femalePct < g.malePct;
          return (
            <span
              key={g.label}
              title={gapHint(g.label)}
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium ${
                womenWorse ? "bg-rose-50 text-rose-700" : "bg-slate-100 text-slate-600"
              }`}
            >
              <Info className="h-3 w-3 opacity-60" />
              {shortMetricName(g.label)}
              <span className="tabular-nums opacity-80">Δ {g.absDiffPct}%</span>
            </span>
          );
        })}
      </div>
    </div>
  );
}

export function DemographicsGapCard({
  snapshot,
}: {
  snapshot: DemographicsSnapshot;
}) {
  const [tab, setTab] = useState<TabId>("gender");

  const ageData = snapshot.ageGroups
    .filter((g) => g.pct != null)
    .map((g) => ({ name: g.name, value: g.pct as number }));

  const educationData = [
    { name: "Literacy", value: snapshot.education.literacyPct },
    { name: "Female literacy", value: snapshot.education.literacyFemalePct },
    { name: "Male literacy", value: snapshot.education.literacyMalePct },
    { name: "Primary", value: snapshot.education.primaryEnrollmentPct },
    { name: "Secondary", value: snapshot.education.secondaryEnrollmentPct },
    { name: "Tertiary", value: snapshot.education.tertiaryEnrollmentPct },
  ].filter((d) => d.value != null) as { name: string; value: number }[];

  const urbanData = [
    { name: "Urban", value: snapshot.urbanRural.urbanPct },
    { name: "Rural", value: snapshot.urbanRural.ruralPct },
  ].filter((d) => d.value != null) as { name: string; value: number }[];

  return (
    <article className="dashboard-card overflow-hidden p-5 sm:p-6">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wide text-slate-900">
            Workforce Demographics
          </h2>
          <p className="mt-0.5 text-sm text-slate-500">{snapshot.country}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <DataSourceButton sourceId="world-bank" />
          <DataSourceButton sourceId="ilostat" label="NEET source" />
        </div>
      </div>

      <div className="mb-5 flex gap-1 rounded-xl bg-slate-100/80 p-1 text-xs">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`flex-1 rounded-lg px-3 py-2 font-medium transition ${
              tab === t.id
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {!snapshot.hasData ? (
        <p className="py-10 text-center text-sm text-slate-500">
          Demographic indicators are not available for this selection yet.
        </p>
      ) : (
        <>
          {tab === "gender" && (
            <div className="grid gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.4fr)]">
              <PopulationSplit snapshot={snapshot} />
              {snapshot.genderDiffs.length > 0 ? (
                <GenderCompareChart gaps={snapshot.genderDiffs} />
              ) : (
                <p className="flex items-center justify-center rounded-2xl bg-slate-50 px-4 py-10 text-sm text-slate-500">
                  Gender-split rates unavailable
                </p>
              )}
            </div>
          )}

          {tab === "age" && (
            <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
              <div className="h-60">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={ageData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 12, fill: "#64748b" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis hide />
                    <Tooltip
                      formatter={(v) => [`${v ?? 0}%`, "Share of population"]}
                      contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12 }}
                    />
                    <Bar dataKey="value" radius={[8, 8, 0, 0]} barSize={48}>
                      {ageData.map((_, i) => (
                        <Cell key={i} fill={AGE_COLORS[i % AGE_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-col justify-center gap-2.5">
                {snapshot.ageGroups.map((g, i) => (
                  <div
                    key={g.name}
                    className="flex items-center justify-between rounded-xl border border-slate-100 px-4 py-3"
                  >
                    <span className="flex items-center gap-2.5 text-sm text-slate-700">
                      <span
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: AGE_COLORS[i % AGE_COLORS.length] }}
                      />
                      Ages {g.name}
                    </span>
                    <span className="text-lg font-bold tabular-nums text-slate-900">
                      {fmtPct(g.pct)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === "education" && (
            <div className="h-72">
              {educationData.length === 0 ? (
                <p className="py-10 text-center text-sm text-slate-500">
                  No education indicators for this country.
                </p>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={educationData}
                    layout="vertical"
                    margin={{ left: 4, right: 24, top: 4, bottom: 4 }}
                  >
                    <XAxis type="number" domain={[0, 100]} hide />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={120}
                      tick={{ fontSize: 12, fill: "#64748b" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      formatter={(v) => [`${v ?? 0}%`, "Rate"]}
                      contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12 }}
                    />
                    <Bar dataKey="value" fill="#3b82f6" radius={[0, 8, 8, 0]} barSize={18} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          )}

          {tab === "urban" && (
            <div className="grid items-center gap-6 lg:grid-cols-[auto_1fr]">
              <div className="relative mx-auto h-56 w-56">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={urbanData}
                      dataKey="value"
                      innerRadius={62}
                      outerRadius={88}
                      paddingAngle={3}
                      stroke="none"
                    >
                      {urbanData.map((_, i) => (
                        <Cell key={i} fill={URBAN_COLORS[i % URBAN_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(v) => [`${v ?? 0}%`, "Share"]}
                      contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12 }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
                    Urban
                  </span>
                  <span className="text-3xl font-bold tabular-nums text-slate-900">
                    {fmtPct(snapshot.urbanRural.urbanPct)}
                  </span>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
                {[
                  { label: "Urban", value: fmtPct(snapshot.urbanRural.urbanPct), color: "bg-sky-500" },
                  { label: "Rural", value: fmtPct(snapshot.urbanRural.ruralPct), color: "bg-slate-500" },
                  {
                    label: "Population growth",
                    value:
                      snapshot.urbanRural.populationGrowthPct == null
                        ? "—"
                        : `${snapshot.urbanRural.populationGrowthPct}%`,
                    color: "bg-emerald-500",
                  },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="rounded-2xl border border-slate-100 bg-slate-50/60 px-4 py-4"
                  >
                    <div className="mb-2 flex items-center gap-2">
                      <span className={`h-2 w-2 rounded-full ${item.color}`} />
                      <p className="text-xs font-medium text-slate-500">{item.label}</p>
                    </div>
                    <p className="text-2xl font-bold tabular-nums text-slate-900">{item.value}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      <div className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-4">
        <Link href="/sources" className="text-xs font-medium text-blue-600 hover:underline">
          Verify data sources →
        </Link>
        <p className="text-right text-[10px] leading-snug text-slate-400">{snapshot.sourceNote}</p>
      </div>
    </article>
  );
}
