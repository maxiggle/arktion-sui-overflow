import Link from "next/link";
import { ArrowLeft, LayoutDashboard, ShieldQuestion } from "lucide-react";
import { RouteState } from "@/app/_components/route-state";

export default function ProtectedNotFound() {
  return (
    <RouteState
      badge="Protected 404"
      title="This protected page isn’t available."
      description="You may not have access to this route, or the page may have been removed."
      details="Head back to your dashboard or home page and continue from there."
    >
      <div className="flex flex-wrap gap-3">
        <Link
          href="/dashboard"
          className="inline-flex h-8 items-center justify-center gap-2 rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/80"
        >
          <LayoutDashboard className="size-4" />
          Dashboard
        </Link>
        <Link
          href="/"
          className="inline-flex h-8 items-center justify-center gap-2 rounded-lg border border-border bg-background px-3 text-sm font-medium transition-colors hover:bg-muted"
        >
          <ShieldQuestion className="size-4" />
          Home
        </Link>
        <Link
          href="/"
          className="inline-flex h-8 items-center justify-center gap-2 rounded-lg border border-border bg-background px-3 text-sm font-medium transition-colors hover:bg-muted"
        >
          <ArrowLeft className="size-4" />
          Back
        </Link>
      </div>
    </RouteState>
  );
}
