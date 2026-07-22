import Link from "next/link";
import { DATA_SOURCES, METRIC_GLOSSARY } from "@/lib/data-sources";
import { ExternalVerifyLink } from "@/app/components/data-source-button";

const KIND_LABEL: Record<(typeof DATA_SOURCES)[number]["kind"], string> = {
  jobs: "Job postings",
  labour: "Labour & population",
  education: "Education",
  geography: "Geography",
  derived: "Derived metric",
};

export function SourcesContent() {
  return (
    <div className="space-y-6">
      <article className="dashboard-card p-6">
        <h2 className="text-lg font-semibold text-slate-900">How to verify our numbers</h2>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-600">
          Every chart on Skills Observatory is built from either (1) job postings we ingested from
          public boards, or (2) official World Bank / ILOSTAT indicators we download into versioned
          JSON bundles. Nothing on Overview invents country statistics. Click any{" "}
          <strong className="font-medium text-slate-800">Data source</strong> button on a card to
          jump to the matching section below, then follow the external link to check the original
          publisher.
        </p>
        <p className="mt-3 text-sm text-slate-500">
          Job data refreshes with <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">Sync Data</code>.
          Indicator bundles refresh with{" "}
          <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">npm run build:demographics</code>{" "}
          and{" "}
          <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">npm run build:youth</code>.
        </p>
      </article>

      <article className="dashboard-card p-6">
        <h2 className="mb-3 text-base font-semibold text-slate-900">Metric glossary</h2>
        <p className="mb-4 text-sm text-slate-500">
          Gender rates are measured <em>within</em> each group (e.g. literacy among women vs
          literacy among men). They are not slices of one pie, so women&apos;s % + men&apos;s % will
          often exceed 100% and that is expected. Population shares (50.1% / 49.9%){" "}
          <em>do</em> add to ~100%.
        </p>
        <dl className="grid gap-4 sm:grid-cols-2">
          {Object.values(METRIC_GLOSSARY).map((item) => (
            <div key={item.term} className="rounded-xl border border-slate-100 bg-slate-50/60 p-4">
              <dt className="text-sm font-semibold text-slate-900">{item.term}</dt>
              <dd className="mt-1.5 text-sm leading-relaxed text-slate-600">{item.meaning}</dd>
            </div>
          ))}
        </dl>
      </article>

      <div className="space-y-4">
        {DATA_SOURCES.map((source) => (
          <article
            key={source.id}
            id={source.id}
            className="dashboard-card scroll-mt-28 p-6"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                  {KIND_LABEL[source.kind]}
                </p>
                <h2 className="mt-0.5 text-lg font-semibold text-slate-900">{source.title}</h2>
              </div>
              <ExternalVerifyLink href={source.verifyUrl} label={source.verifyLabel} />
            </div>

            <p className="mt-3 text-sm leading-relaxed text-slate-600">{source.summary}</p>

            {source.caveat && (
              <p className="mt-3 rounded-lg border border-amber-100 bg-amber-50/80 px-3 py-2 text-xs leading-relaxed text-amber-900">
                {source.caveat}
              </p>
            )}

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Used for
                </p>
                <ul className="mt-2 space-y-1 text-sm text-slate-700">
                  {source.powers.map((p) => (
                    <li key={p} className="flex gap-2">
                      <span className="text-blue-500">•</span>
                      {p}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Refresh
                </p>
                <p className="mt-2 rounded-lg bg-slate-50 px-3 py-2 font-mono text-xs text-slate-700">
                  {source.refresh}
                </p>
              </div>
            </div>
          </article>
        ))}
      </div>

      <p className="text-center text-sm text-slate-500">
        Back to{" "}
        <Link href="/" className="font-medium text-blue-600 hover:underline">
          Overview
        </Link>
      </p>
    </div>
  );
}
