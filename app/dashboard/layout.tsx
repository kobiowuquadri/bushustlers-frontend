import { Suspense } from "react";
import { AppShell } from "@/components/app-shell";
import { Spinner } from "@/components/ui";

export default function DashboardLayout({ children }: LayoutProps<"/dashboard">) {
  return (
    <Suspense
      fallback={
        <div className="grid min-h-screen place-items-center">
          <Spinner label="Loading your workspace" />
        </div>
      }
    >
      <AppShell>{children}</AppShell>
    </Suspense>
  );
}
