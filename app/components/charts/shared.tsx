"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Area, AreaChart, ResponsiveContainer, Tooltip } from "recharts";
import { ChevronRight, TrendingDown, TrendingUp } from "lucide-react";
import type { WeeklyPoint } from "@/lib/analytics";

export function formatInt(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

export const GAP_COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#8b5cf6"];

const MAP_POSITIONS: Record<string, { x: number; y: number }> = {
  Nigeria: { x: 42, y: 52 },
  Ghana: { x: 28, y: 54 },
  Kenya: { x: 72, y: 58 },
  Rwanda: { x: 68, y: 62 },
  Tanzania: { x: 74, y: 66 },
  "South Africa": { x: 58, y: 88 },
};

function formatWeekRange(weekStart: string, weekEnd: string) {
  const start = new Date(weekStart);
  // weekEnd is exclusive (start of the following week) — show the inclusive last day.
  const end = new Date(new Date(weekEnd).getTime() - 24 * 60 * 60 * 1000);
  const sameMonth = start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear();
  const startLabel = start.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const endLabel = end.toLocaleDateString(
    "en-US",
    sameMonth ? { day: "numeric", year: "numeric" } : { month: "short", day: "numeric", year: "numeric" },
  );
  return `${startLabel} – ${endLabel}`;
}

function SparklineTooltip({
  active,
  payload,
  formatValue = formatInt,
}: {
  active?: boolean;
  payload?: { payload: WeeklyPoint }[];
  formatValue?: (value: number) => string;
}) {
  if (!active || !payload || payload.length === 0) return null;
  const point = payload[0].payload;
  return (
    <div className="rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs shadow-sm">
      <p className="font-medium text-slate-700">{formatWeekRange(point.weekStart, point.weekEnd)}</p>
      <p className="text-slate-500">{formatValue(point.value)}</p>
    </div>
  );
}

export function Sparkline({
  data,
  color,
  formatValue = formatInt,
}: {
  data: WeeklyPoint[];
  color: string;
  formatValue?: (value: number) => string;
}) {
  return (
    <div className="h-10 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={`grad-${color.replace("#", "")}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.35} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Tooltip
            content={<SparklineTooltip formatValue={formatValue} />}
            cursor={{ stroke: color, strokeWidth: 1, strokeDasharray: "3 3" }}
            wrapperStyle={{ zIndex: 40, outline: "none" }}
            allowEscapeViewBox={{ x: false, y: true }}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={2}
            fill={`url(#grad-${color.replace("#", "")})`}
            dot={false}
            activeDot={{ r: 3, fill: color, stroke: "#fff", strokeWidth: 1.5 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function KpiCard({
  title,
  value,
  caption,
  change,
  changeLabel,
  trend,
  invertTrend,
  icon: Icon,
  iconBg,
  sparkColor,
  sparkData,
  sparkFormat,
  href,
}: {
  title: string;
  value: string;
  caption?: string;
  change?: number | null;
  changeLabel?: string;
  trend?: "up" | "down";
  invertTrend?: boolean;
  icon: React.ElementType;
  iconBg: string;
  sparkColor: string;
  sparkData: WeeklyPoint[];
  sparkFormat?: (value: number) => string;
  href?: string;
}) {
  const hasTrend = trend !== undefined;
  const isPositive = invertTrend ? trend === "down" : trend === "up";
  const card = (
    <article
      className={`dashboard-card p-4 ${
        href ? "transition hover:border-blue-200 hover:shadow-md" : ""
      }`}
    >
      <div className="flex items-start justify-between">
        <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${iconBg}`}>
          <Icon className="h-5 w-5 text-white" />
        </div>
        {hasTrend && (
          change == null ? (
            <span className="text-[11px] font-medium text-slate-400" title="Not enough prior-period data to compute change">
              n/a
            </span>
          ) : (
            <div
              className={`flex items-center gap-1 text-xs font-semibold ${
                isPositive ? "text-emerald-600" : "text-red-500"
              }`}
            >
              {trend === "up" ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
              {Math.abs(change)}%
            </div>
          )
        )}
      </div>
      <p className="mt-3 text-xs font-medium uppercase tracking-wide text-slate-500">{title}</p>
      <p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>
      <p className="mt-0.5 text-xs text-slate-400">{caption ?? changeLabel}</p>
      <div className="mt-3">
        <Sparkline data={sparkData} color={sparkColor} formatValue={sparkFormat} />
      </div>
    </article>
  );

  return href ? (
    <Link href={href} aria-label={`View ${title}`}>
      {card}
    </Link>
  ) : (
    card
  );
}

export function AfricaMap({
  countries,
}: {
  countries: { country: string; jobs: number; flag?: string }[];
}) {
  const maxJobs = Math.max(...countries.map((c) => c.jobs), 1);
  return (
    <div className="relative mx-auto h-56 w-full max-w-md">
      <svg viewBox="0 0 100 100" className="h-full w-full">
        <ellipse cx="50" cy="52" rx="38" ry="42" fill="#e0f2fe" stroke="#bae6fd" strokeWidth="0.5" />
        {countries.map((item) => {
          const pos = MAP_POSITIONS[item.country];
          if (!pos) return null;
          const intensity = 0.35 + (item.jobs / maxJobs) * 0.65;
          const radius = 4 + (item.jobs / maxJobs) * 6;
          return (
            <g key={item.country}>
              <circle
                cx={pos.x}
                cy={pos.y}
                r={radius + 2}
                fill={`rgba(37, 99, 235, ${intensity * 0.3})`}
              />
              <circle
                cx={pos.x}
                cy={pos.y}
                r={radius}
                fill={`rgba(37, 99, 235, ${intensity})`}
                stroke="#1d4ed8"
                strokeWidth="0.5"
              />
              <title>
                {item.country}: {formatInt(item.jobs)} jobs
              </title>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export function DataSourceBadge({ sources }: { sources: { source: string; _count: { source: number } }[] }) {
  const searchParams = useSearchParams();
  if (sources.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {sources.map((s) => {
        const params = new URLSearchParams();
        const country = searchParams.get("country");
        if (country) params.set("country", country);
        params.set("source", s.source);

        return (
          <Link
            key={s.source}
            href={`/jobs?${params.toString()}`}
            title={`View all ${s.source} job postings`}
            className="group flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-600 transition hover:bg-blue-50 hover:text-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <span>
              {s.source}: {formatInt(s._count.source)}
            </span>
            <ChevronRight className="h-3 w-3 transition group-hover:translate-x-0.5" />
          </Link>
        );
      })}
      <Link
        href="/sources#job-boards"
        className="rounded-full border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-500 transition hover:border-blue-200 hover:text-blue-700"
      >
        All data sources →
      </Link>
    </div>
  );
}
