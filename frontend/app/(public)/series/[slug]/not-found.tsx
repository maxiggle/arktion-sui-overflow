import Link from "next/link";
import { ArrowLeft, LibraryBig, Search } from "lucide-react";
import { RouteState } from "@/app/_components/route-state";

export default function SeriesSlugNotFound() {
  return (
    <RouteState
      badge="Series not found"
      title="That series slug doesn’t resolve."
      description="The story may have moved, been unpublished, or the slug may be incorrect."
      details="Try browsing explore to find the series again, or go back to the catalog."
    >
      <div className="flex flex-wrap gap-3">
        <Link
          href="/explore"
          className="inline-flex h-8 items-center justify-center gap-2 rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/80"
        >
          <Search className="size-4" />
          Explore
        </Link>
        <Link
          href="/"
          className="inline-flex h-8 items-center justify-center gap-2 rounded-lg border border-border bg-background px-3 text-sm font-medium transition-colors hover:bg-muted"
        >
          <LibraryBig className="size-4" />
          Home
        </Link>
        <Link
          href="/explore"
          className="inline-flex h-8 items-center justify-center gap-2 rounded-lg border border-border bg-background px-3 text-sm font-medium transition-colors hover:bg-muted"
        >
          <ArrowLeft className="size-4" />
          Back
        </Link>
      </div>
    </RouteState>
  );
}
