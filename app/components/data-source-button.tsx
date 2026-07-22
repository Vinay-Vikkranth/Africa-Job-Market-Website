"use client";

import Link from "next/link";
import { BookOpen, ExternalLink } from "lucide-react";

/** Compact control that jumps to the Data Sources page anchor. */
export function DataSourceButton({
  sourceId,
  label = "Data source",
  className = "",
}: {
  sourceId: string;
  label?: string;
  className?: string;
}) {
  return (
    <Link
      href={`/sources#${sourceId}`}
      className={`inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-600 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 ${className}`}
    >
      <BookOpen className="h-3 w-3" />
      {label}
    </Link>
  );
}

export function ExternalVerifyLink({
  href,
  label,
}: {
  href: string;
  label: string;
}) {
  const external = href.startsWith("http");
  if (!external) {
    return (
      <Link href={href} className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:underline">
        {label}
      </Link>
    );
  }
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:underline"
    >
      {label}
      <ExternalLink className="h-3.5 w-3.5" />
    </a>
  );
}
