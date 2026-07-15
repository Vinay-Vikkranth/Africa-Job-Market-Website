"use client";

import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { DashboardData } from "@/lib/dashboard-data";

export function SkillsContent({ data }: { data: DashboardData }) {
  return (
    <section className="grid gap-4 lg:grid-cols-2">
      <article className="dashboard-card p-5">
        <h2 className="mb-4 text-sm font-semibold text-slate-900">Skill Demand (% share of total demand)</h2>
        <div style={{ height: Math.max(320, data.topSkills.length * 30) }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.topSkills} layout="vertical" margin={{ top: 0, right: 20, left: 0, bottom: 0 }}>
              <XAxis type="number" hide />
              <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
              <Tooltip formatter={(value) => [`${value ?? 0}%`, "Share of demand"]} contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12 }} />
              <Bar dataKey="demandPct" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={16} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </article>

      <article className="dashboard-card p-5">
        <h2 className="mb-4 text-sm font-semibold text-slate-900">Raw Skill Mentions</h2>
        <div className="space-y-3">
          {data.topSkills.map((skill, i) => (
            <div key={skill.name} className="flex items-center justify-between rounded-lg border border-slate-100 px-4 py-3">
              <div className="flex items-center gap-3">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">
                  {i + 1}
                </span>
                <span className="font-medium text-slate-800">{skill.name}</span>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-slate-900">{skill.mentions} mentions</p>
                <p className="text-xs text-slate-500">{skill.demandPct}% of skill demand</p>
              </div>
            </div>
          ))}
        </div>
      </article>

      <article className="dashboard-card p-5 lg:col-span-2">
        <h2 className="mb-2 text-sm font-semibold text-slate-900">Demand vs Supply by Skill</h2>
        <p className="mb-4 text-xs text-slate-500">Computed from job-skill links: recent 30 days = demand, older postings = supply proxy</p>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.demandVsSupply}>
              <XAxis dataKey="skill" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12 }} />
              <Bar dataKey="demand" name="Demand (30d)" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              <Bar dataKey="supply" name="Supply (prior)" fill="#10b981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </article>
    </section>
  );
}
