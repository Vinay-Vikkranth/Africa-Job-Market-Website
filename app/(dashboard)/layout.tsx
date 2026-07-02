import { Suspense } from "react";
import { DashboardShell } from "@/app/components/dashboard-shell";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center">Loading...</div>}>
      <DashboardShell>{children}</DashboardShell>
    </Suspense>
  );
}
