"use client";

import { useState } from "react";
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
import type { DashboardData } from "@/lib/dashboard-data";
import type { SkillGapRow } from "@/lib/analytics";
import { GAP_COLORS } from "@/app/components/charts/shared";

// ── helpers ───────────────────────────────────────────────────────────────────

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function gapColor(score: number): string {
  if (score > 20) return "text-rose-600";
  if (score > 5) return "text-amber-500";
  return "text-emerald-600";
}

// ── shared sortable-column header ─────────────────────────────────────────────

function SortTh({
  col,
  label,
  sort,
  asc,
  onSort,
  align = "right",
}: {
  col: string;
  label: string;
  sort: string;
  asc: boolean;
  onSort: (col: string) => void;
  align?: "left" | "right";
}) {
  const active = sort === col;
  return (
    <th
      className={`cursor-pointer select-none pb-2 text-${align} text-xs font-medium text-slate-500 hover:text-slate-700`}
      onClick={() => onSort(col)}
    >
      {label}
      {active ? (asc ? " ▲" : " ▼") : ""}
    </th>
  );
}

// ── progress bar ─────────────────────────────────────────────────────────────

function MiniBar({ pct, color }: { pct: number; color: string }) {
  return (
    <div className="relative h-2 w-24 overflow-hidden rounded-full bg-slate-100">
      <div
        className="h-full rounded-full transition-all"
        style={{ width: `${Math.min(100, Math.abs(pct))}%`, background: color }}
      />
    </div>
  );
}

// ── View A: Skills in Demand ──────────────────────────────────────────────────

type SkillRow = { name: string; tier1: string; mentions: number; demandPct: number };
type DemandSortKey = "mentions" | "demandPct" | "skill" | "tier1";

function SkillsInDemandTable({ skills }: { skills: SkillRow[] }) {
  const [sort, setSort] = useState<DemandSortKey>("mentions");
  const [asc, setAsc] = useState(false);
  const [tier1Filter, setTier1Filter] = useState("All");

  const tiers = ["All", ...Array.from(new Set(skills.map((s) => s.tier1))).sort()];

  const filtered = tier1Filter === "All" ? skills : skills.filter((s) => s.tier1 === tier1Filter);

  const sorted = [...filtered].sort((a, b) => {
    let diff = 0;
    if (sort === "mentions") diff = a.mentions - b.mentions;
    else if (sort === "demandPct") diff = a.demandPct - b.demandPct;
    else if (sort === "skill") diff = a.name.localeCompare(b.name);
    else if (sort === "tier1") diff = a.tier1.localeCompare(b.tier1);
    return asc ? diff : -diff;
  });

  function handleSort(key: string) {
    const k = key as DemandSortKey;
    if (sort === k) setAsc((v) => !v);
    else { setSort(k); setAsc(false); }
  }

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-slate-500">Filter by category:</span>
        {tiers.map((t) => (
          <button
            key={t}
            onClick={() => setTier1Filter(t)}
            className={`rounded-full px-3 py-0.5 text-xs font-medium transition ${
              tier1Filter === t ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            {capitalize(t)}
          </button>
        ))}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100">
              <SortTh col="skill" label="Skill" sort={sort} asc={asc} onSort={handleSort} align="left" />
              <SortTh col="tier1" label="Category" sort={sort} asc={asc} onSort={handleSort} align="left" />
              <th className="pb-2 text-right text-xs font-medium text-slate-500">Jobs Mentioning</th>
              <SortTh col="demandPct" label="Demand %" sort={sort} asc={asc} onSort={handleSort} />
            </tr>
          </thead>
          <tbody>
            {sorted.map((s) => (
              <tr key={s.name} className="border-b border-slate-50 hover:bg-slate-50/60">
                <td className="py-2 font-medium text-slate-800">{s.name}</td>
                <td className="py-2 text-xs text-slate-500">{capitalize(s.tier1)}</td>
                <td className="py-2 text-right tabular-nums text-slate-600">{s.mentions}</td>
                <td className="py-2">
                  <div className="flex items-center gap-2">
                    <MiniBar pct={s.demandPct * 5} color="#3b82f6" />
                    <span className="tabular-nums text-xs text-slate-600">{s.demandPct}%</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {sorted.length === 0 && (
          <p className="py-6 text-center text-sm text-slate-400">No skills match this filter.</p>
        )}
      </div>
    </div>
  );
}

// ── View B: Curriculum Gap table ──────────────────────────────────────────────

type GapSortKey = "gapScore" | "demandPct" | "supplyPct" | "skill";

function CurriculumGapTable({ rows }: { rows: SkillGapRow[] }) {
  const [sort, setSort] = useState<GapSortKey>("gapScore");
  const [asc, setAsc] = useState(false);

  const sorted = [...rows].sort((a, b) => {
    let diff = 0;
    if (sort === "gapScore") diff = a.gapScore - b.gapScore;
    else if (sort === "demandPct") diff = a.demandPct - b.demandPct;
    else if (sort === "supplyPct") diff = a.supplyPct - b.supplyPct;
    else diff = a.skill.localeCompare(b.skill);
    return asc ? diff : -diff;
  });

  function handleSort(key: string) {
    const k = key as GapSortKey;
    if (sort === k) setAsc((v) => !v);
    else { setSort(k); setAsc(false); }
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-100">
            <SortTh col="skill" label="Skill" sort={sort} asc={asc} onSort={handleSort} align="left" />
            <th className="pb-2 text-left text-xs font-medium text-slate-500">Category</th>
            <SortTh col="demandPct" label="Demand %" sort={sort} asc={asc} onSort={handleSort} />
            <SortTh col="supplyPct" label="Supply %" sort={sort} asc={asc} onSort={handleSort} />
            <SortTh col="gapScore" label="Gap Score" sort={sort} asc={asc} onSort={handleSort} />
            <th className="pb-2 text-left pl-4 text-xs font-medium text-slate-500">Status</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((r) => (
            <tr key={r.skill} className="border-b border-slate-50 hover:bg-slate-50/60">
              <td className="py-2 font-medium text-slate-800">{r.skill}</td>
              <td className="py-2 text-xs text-slate-500">{capitalize(r.tier1)}</td>
              <td className="py-2 text-right tabular-nums text-slate-700">{r.demandPct}%</td>
              <td className={`py-2 text-right tabular-nums ${r.supplyPct > 0 ? "text-emerald-600" : "text-slate-400"}`}>
                {r.supplyPct}%
              </td>
              <td className="py-2 text-right tabular-nums">
                <span className={`font-semibold ${gapColor(r.gapScore)}`}>
                  {r.gapScore > 0 ? "+" : ""}{r.gapScore}
                </span>
              </td>
              <td className="py-2 pl-4">
                {r.supplyPct === 0 ? (
                  <span className="rounded-full bg-rose-50 px-2 py-0.5 text-xs font-medium text-rose-600">Not covered</span>
                ) : r.gapScore > 10 ? (
                  <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">Partially covered</span>
                ) : (
                  <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">Well covered</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── main component ────────────────────────────────────────────────────────────

export function GapsContent({ data }: { data: DashboardData }) {
  const gapChartData = [
    { name: "Technical", value: data.skillGap.technical },
    { name: "Digital", value: data.skillGap.digital },
    { name: "Soft Skills", value: data.skillGap.soft },
    { name: "Business", value: data.skillGap.business },
  ];

  const sg = data.syllabusGap;

  return (
    <div className="space-y-6">

      {/* ── View A: Skills in Demand ── */}
      <section className="dashboard-card p-5">
        <div className="mb-4">
          <h2 className="text-base font-semibold text-slate-900">Skills in Demand</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {data.topSkills.length} unique skills extracted from {data.meta.totalJobs.toLocaleString()} job postings
          </p>
        </div>
        <SkillsInDemandTable skills={data.topSkills} />
      </section>

      {/* ── View B: Curriculum Gap (Nigeria only) ── */}
      {sg && (
        <section>
          <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Curriculum Gap Analysis — {sg.country}
              </h2>
              <p className="text-xs text-slate-500">
                Source: {sg.source} &middot; {sg.totalPrograms} computing programmes
              </p>
            </div>
            <div className="flex flex-wrap gap-1">
              {sg.programNames.map((p) => (
                <span key={p} className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700">
                  {p}
                </span>
              ))}
            </div>
          </div>

          {/* KPI row */}
          <div className="grid gap-4 sm:grid-cols-3 mb-4">
            <article className="dashboard-card p-5 flex flex-col gap-2">
              <span className="text-xs text-slate-500 font-medium uppercase tracking-wide">Curriculum Coverage</span>
              <span className="text-4xl font-bold text-emerald-600">{sg.coverageRate}%</span>
              <div className="relative h-3 w-full overflow-hidden rounded-full bg-slate-100">
                <div className="h-full rounded-full" style={{ width: `${sg.coverageRate}%`, background: "#10b981" }} />
              </div>
              <p className="text-xs text-slate-500">of demanded skill mentions are covered by the curriculum</p>
            </article>

            <article className="dashboard-card p-5 flex flex-col gap-2">
              <span className="text-xs text-slate-500 font-medium uppercase tracking-wide">Curriculum Gap</span>
              <span className="text-4xl font-bold text-rose-500">{sg.gapRate}%</span>
              <div className="relative h-3 w-full overflow-hidden rounded-full bg-slate-100">
                <div className="h-full rounded-full" style={{ width: `${sg.gapRate}%`, background: "#f43f5e" }} />
              </div>
              <p className="text-xs text-slate-500">of demanded skill mentions have no curriculum coverage</p>
            </article>

            <article className="dashboard-card p-5 flex flex-col gap-2">
              <span className="text-xs text-slate-500 font-medium uppercase tracking-wide">Skills Analysed</span>
              <span className="text-4xl font-bold text-slate-700">{sg.allSkills.length}</span>
              <div className="flex gap-3 text-xs mt-1">
                <span className="flex items-center gap-1">
                  <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
                  {sg.coveredSkills.length} covered
                </span>
                <span className="flex items-center gap-1">
                  <span className="inline-block h-2 w-2 rounded-full bg-rose-400" />
                  {sg.gapSkills.length} gaps
                </span>
              </div>
              <p className="text-xs text-slate-500">skills from {sg.country} job postings</p>
            </article>
          </div>

          {/* Quick charts */}
          <div className="grid gap-4 lg:grid-cols-2 mb-4">
            <article className="dashboard-card p-5">
              <h3 className="mb-3 text-sm font-semibold text-slate-900 flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-rose-400 inline-block" />
                Top Skills NOT in Curriculum
              </h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={sg.gapSkills.slice(0, 10)}
                    layout="vertical"
                    margin={{ left: 8, right: 32, top: 4, bottom: 4 }}
                  >
                    <XAxis type="number" tick={{ fontSize: 11 }} unit="%" />
                    <YAxis type="category" dataKey="skill" tick={{ fontSize: 11 }} width={110} />
                    <Tooltip
                      formatter={(v) => [`${v}%`, "Demand"]}
                      contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12 }}
                    />
                    <Bar dataKey="demandPct" name="Demand" fill="#f43f5e" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </article>

            <article className="dashboard-card p-5">
              <h3 className="mb-3 text-sm font-semibold text-slate-900 flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-500 inline-block" />
                Demand vs Supply — Covered Skills
              </h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={sg.coveredSkills.slice(0, 10)}
                    layout="vertical"
                    margin={{ left: 8, right: 32, top: 4, bottom: 4 }}
                  >
                    <XAxis type="number" tick={{ fontSize: 11 }} unit="%" />
                    <YAxis type="category" dataKey="skill" tick={{ fontSize: 11 }} width={110} />
                    <Tooltip
                      formatter={(v, name) => [`${v}%`, name === "supplyPct" ? "Supply (curriculum)" : "Demand"]}
                      contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12 }}
                    />
                    <Bar dataKey="demandPct" name="demandPct" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                    <Bar dataKey="supplyPct" name="supplyPct" fill="#10b981" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </article>
          </div>

          {/* Full per-skill gap table */}
          <article className="dashboard-card p-5">
            <div className="mb-3">
              <h3 className="text-sm font-semibold text-slate-900">
                Skill Gap Detail — Demand vs Curriculum Supply
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Gap Score = Demand% − Supply%. Positive = skill demanded more than curriculum covers.
                Supply% = programmes covering skill / {sg.totalPrograms} total programmes.
              </p>
            </div>
            <CurriculumGapTable rows={sg.allSkills} />
          </article>
        </section>
      )}

      {/* ── Standard category distribution ── */}
      <section className="grid gap-4 lg:grid-cols-2">
        <article className="dashboard-card p-5">
          <h2 className="mb-4 text-sm font-semibold text-slate-900">Skill Category Distribution</h2>
          <div className="relative h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={gapChartData}
                  cx="50%" cy="50%"
                  innerRadius={60} outerRadius={90}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {gapChartData.map((_, index) => (
                    <Cell key={index} fill={GAP_COLORS[index % GAP_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value) => [`${value ?? 0}%`, "Share of demand"]}
                  contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12 }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-bold text-slate-900">{data.skillGap.overall}%</span>
              <span className="text-xs text-slate-500">Gap Index</span>
            </div>
          </div>
        </article>

        <article className="dashboard-card p-5">
          <h2 className="mb-4 text-sm font-semibold text-slate-900">Demand vs Supply Gap</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.demandVsSupply}>
                <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12 }} />
                <Bar dataKey="demand" name="Demand" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="supply" name="Supply" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </article>

        <article className="dashboard-card p-5 lg:col-span-2">
          <h2 className="mb-4 text-sm font-semibold text-slate-900">Category Breakdown</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {gapChartData.map((cat, i) => (
              <div key={cat.name} className="rounded-xl border border-slate-100 p-4">
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full" style={{ background: GAP_COLORS[i] }} />
                  <span className="text-sm font-medium text-slate-700">{cat.name}</span>
                </div>
                <p className="mt-2 text-2xl font-bold text-slate-900">{cat.value}%</p>
                <p className="text-xs text-slate-500">of total skill demand</p>
              </div>
            ))}
          </div>
        </article>
      </section>
    </div>
  );
}
