import { Card, CardContent } from "@/components/ui/card";
import { SectionHeading } from "@/components/site/section-heading";
import { publicMilestones } from "@/lib/public-content";

export default function Page() {
  return (
    <div className="mx-auto w-full max-w-7xl space-y-10 px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
      <SectionHeading
        eyebrow="Roadmap"
        title="Build the public surface before the heavier tools."
        description="The platform should feel coherent from the first homepage load, then expand into reader, creator, and admin capability in order."
      />

      <div className="grid gap-6">
        {publicMilestones.map((milestone) => (
          <Card key={milestone.quarter} className="border-border/60 bg-card/90">
            <CardContent className="grid gap-3 p-6 md:grid-cols-[160px_1fr] md:items-start">
              <p className="text-xs font-semibold uppercase tracking-[0.35em] text-muted-foreground">
                {milestone.quarter}
              </p>
              <div className="space-y-2">
                <h2 className="font-heading text-xl font-semibold">
                  {milestone.title}
                </h2>
                <p className="text-sm leading-7 text-muted-foreground">
                  {milestone.description}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
