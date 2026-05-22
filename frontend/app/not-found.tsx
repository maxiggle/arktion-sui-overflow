import Link from "next/link";
import { ArrowLeft, Home, Search } from "lucide-react";
import { RouteState } from "@/app/_components/route-state";

export default function NotFound() {
  return (
    <RouteState
      badge="404"
      title="We couldn’t find that page."
      description="The page may have moved, been removed, or never existed. Try the home page or explore the catalog instead."
      details="If you expected a story, chapter, or creator page here, double-check the URL and try again."
    >
      <div className="flex flex-wrap gap-3">
        <Link
          href="/"
          className="inline-flex h-8 items-center justify-center gap-2 rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/80"
        >
          <Home className="size-4" />
          Home
        </Link>
        <Link
          href="/explore"
          className="inline-flex h-8 items-center justify-center gap-2 rounded-lg border border-border bg-background px-3 text-sm font-medium transition-colors hover:bg-muted"
        >
          <Search className="size-4" />
          Explore
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
