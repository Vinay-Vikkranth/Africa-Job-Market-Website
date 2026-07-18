import { Building2, GraduationCap, Users, Venus, AlertTriangle } from "lucide-react";
import type { WorkforceContext } from "@/lib/world-bank";

function Tile({
  icon: Icon,
  iconBg,
  label,
  value,
  subLabel,
}: {
  icon: React.ElementType;
  iconBg: string;
  label: string;
  value: string;
  subLabel: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-slate-100 bg-slate-50/60 p-3">
      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${iconBg}`}>
        <Icon className="h-4 w-4 text-white" />
      </div>
      <div className="min-w-0">
        <p className="truncate text-[11px] font-medium text-slate-500">{label}</p>
        <p className="text-base font-bold text-slate-900">{value}</p>
        <p className="truncate text-[11px] text-slate-400">{subLabel}</p>
      </div>
    </div>
  );
}

export function WorkforceContextSection({ context }: { context: WorkforceContext }) {
  const tiles: React.ComponentProps<typeof Tile>[] = [];

  if (context.workingAgePct) {
    const pctLabel = `${context.workingAgePct.value.toFixed(1)}%`;
    const millions =
      context.totalPopulation && context.workingAgePct
        ? ((context.totalPopulation.value * context.workingAgePct.value) / 100 / 1_000_000).toFixed(1)
        : null;
    tiles.push({
      icon: Users,
      iconBg: "bg-blue-500",
      label: "Working-age Population (15-64)",
      value: millions ? `${millions}M` : pctLabel,
      subLabel: context.ssa.workingAgePct
        ? `${pctLabel} of total · SSA avg ${context.ssa.workingAgePct.value.toFixed(1)}%`
        : `${pctLabel} of total (${context.workingAgePct.year})`,
    });
  }

  if (context.femaleLaborForcePct) {
    tiles.push({
      icon: Venus,
      iconBg: "bg-rose-500",
      label: "Female Labor Force Participation",
      value: `${context.femaleLaborForcePct.value.toFixed(1)}%`,
      subLabel: context.maleLaborForcePct
        ? `vs ${context.maleLaborForcePct.value.toFixed(1)}% (Male) · ${context.femaleLaborForcePct.year}`
        : context.femaleLaborForcePct.year,
    });
  }

  if (context.urbanizationPct) {
    tiles.push({
      icon: Building2,
      iconBg: "bg-indigo-500",
      label: "Urbanization Rate",
      value: `${context.urbanizationPct.value.toFixed(1)}%`,
      subLabel: context.ssa.urbanizationPct
        ? `SSA avg ${context.ssa.urbanizationPct.value.toFixed(1)}% · ${context.urbanizationPct.year}`
        : context.urbanizationPct.year,
    });
  }

  if (context.tertiaryAttainmentPct) {
    tiles.push({
      icon: GraduationCap,
      iconBg: "bg-violet-500",
      label: "Tertiary Education Attainment (25+)",
      value: `${context.tertiaryAttainmentPct.value.toFixed(1)}%`,
      subLabel: `Bachelor's or higher · ${context.tertiaryAttainmentPct.year}`,
    });
  }

  if (context.youthUnemploymentPct) {
    tiles.push({
      icon: AlertTriangle,
      iconBg: "bg-red-500",
      label: "Youth Unemployment (15-24)",
      value: `${context.youthUnemploymentPct.value.toFixed(1)}%`,
      subLabel: context.ssa.youthUnemploymentPct
        ? `SSA avg ${context.ssa.youthUnemploymentPct.value.toFixed(1)}% · ${context.youthUnemploymentPct.year}`
        : context.youthUnemploymentPct.year,
    });
  }

  if (tiles.length === 0) return null;

  return (
    <article className="dashboard-card p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-slate-900">
          Workforce Context ({context.country})
        </h2>
        <a
          href="https://data.worldbank.org/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-blue-600 hover:underline"
        >
          Source: World Bank Open Data ↗
        </a>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {tiles.map((tile) => (
          <Tile key={tile.label} {...tile} />
        ))}
      </div>
    </article>
  );
}
