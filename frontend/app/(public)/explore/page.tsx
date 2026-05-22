import { ExploreBrowser } from "@/components/site/explore-browser";
import { SectionHeading } from "@/components/site/section-heading";

export default function Page() {
  return (
    <div className="mx-auto w-full max-w-7xl space-y-10 px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
      <SectionHeading
        eyebrow="Explore"
        title="Browse the library with intention."
        description="Search by title, filter by category, and surface the series that matter before a user ever reaches auth or the reader."
      />
      <ExploreBrowser />
    </div>
  );
}
