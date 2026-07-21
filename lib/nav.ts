import {
  BarChart3,
  Bell,
  BookOpen,
  Download,
  DollarSign,
  LayoutDashboard,
} from "lucide-react";

export const NAV_ITEMS = [
  { href: "/", label: "Overview", icon: LayoutDashboard },
  { href: "/salary", label: "Salary Insights", icon: DollarSign },
  { href: "/gaps", label: "Skill Mix", icon: BarChart3 },
  { href: "/sources", label: "Data Sources", icon: BookOpen },
  { href: "/reports", label: "Reports", icon: Download },
  { href: "/alerts", label: "Alerts", icon: Bell },
] as const;

export const PAGE_META: Record<string, { title: string; subtitle: string }> = {
  "/": {
    title: "Overview",
    subtitle: "Live African job-market demand, with official labour indicators as context",
  },
  "/jobs": {
    title: "Jobs Overview",
    subtitle: "Browse live job postings ingested from public job boards",
  },
  "/salary": {
    title: "Salary Insights",
    subtitle: "Compensation from postings that disclose salary (coverage varies)",
  },
  "/gaps": {
    title: "Skill Mix",
    subtitle: "How demand is distributed across skill categories in job ads",
  },
  "/sources": {
    title: "Data Sources",
    subtitle: "Verify where every indicator and job count comes from",
  },
  "/reports": {
    title: "Reports",
    subtitle: "Export analytics from the live job database",
  },
  "/alerts": {
    title: "Alerts",
    subtitle: "Notices from recent ingestions and demand concentration",
  },
};
