import {
  BarChart3,
  Bell,
  Briefcase,
  Download,
  DollarSign,
  LayoutDashboard,
  Target,
  Zap,
} from "lucide-react";

export const NAV_ITEMS = [
  { href: "/", label: "Overview", icon: LayoutDashboard },
  { href: "/jobs", label: "Jobs Overview", icon: Briefcase },
  { href: "/skills", label: "Skills Demand", icon: Target },
  { href: "/salary", label: "Salary Insights", icon: DollarSign },
  { href: "/tech", label: "Emerging Tech", icon: Zap },
  { href: "/gaps", label: "Skill Gaps", icon: BarChart3 },
  { href: "/reports", label: "Reports", icon: Download },
  { href: "/alerts", label: "Alerts", icon: Bell },
] as const;

export const PAGE_META: Record<string, { title: string; subtitle: string }> = {
  "/": {
    title: "Overview",
    subtitle: "Real-time insights into Africa's job market and skills landscape",
  },
  "/jobs": {
    title: "Jobs Overview",
    subtitle: "Browse live job postings ingested from external job board APIs",
  },
  "/skills": {
    title: "Skills Demand",
    subtitle: "Skill frequency and demand trends computed from job posting text",
  },
  "/salary": {
    title: "Salary Insights",
    subtitle: "Salary distributions derived from postings that disclose compensation",
  },
  "/tech": {
    title: "Emerging Tech",
    subtitle: "Fastest-growing technologies by mention growth over the last 30 days",
  },
  "/gaps": {
    title: "Skill Gaps",
    subtitle: "Demand vs supply analysis across skill categories",
  },
  "/reports": {
    title: "Reports",
    subtitle: "Export workforce analytics generated from live database queries",
  },
  "/alerts": {
    title: "Alerts",
    subtitle: "Automated alerts triggered by shifts in demand and skill gaps",
  },
};
