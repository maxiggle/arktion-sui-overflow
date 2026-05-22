import { PublicPageHero } from "@/components/site/public-page-hero";
import { PublicShell } from "@/components/site/public-shell";
import { SectionHeading } from "@/components/site/section-heading";
import { StoryCard } from "@/components/site/story-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  featuredStories,
  publicFeatures,
  publicPrinciples,
} from "@/lib/public-content";
import Link from "next/link";
import { ArrowRight, CheckCircle2 } from "lucide-react";

export default function Home() {
  return (
    <PublicShell>
      <PublicPageHero
        title="Stories deserve a better public surface."
        subtitle="Arktion presents a high-contrast editorial homepage, immersive series pages, and a full-screen reader built for long-form fiction — not a generic dashboard repaint."
        primaryHref="/explore"
        primaryLabel="Explore stories"
        secondaryHref="/series/emberfall"
        secondaryLabel="Open featured series"
      />

      <div className="mx-auto w-full max-w-7xl space-y-20 px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
        <section className="grid gap-6 lg:grid-cols-3">
          {publicFeatures.map((feature) => (
            <Card key={feature.title} className="border-border/60 bg-card/90">
              <CardContent className="space-y-4 p-6">
                <feature.icon className="size-5 text-primary" />
                <h2 className="font-heading text-lg font-semibold">
                  {feature.title}
                </h2>
                <p className="text-sm leading-6 text-muted-foreground">
                  {feature.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </section>

        <section className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-start">
          <div className="space-y-8">
            <SectionHeading
              eyebrow="Featured stories"
              title="The public library feels curated, not crowded."
              description="Use the explore surface to discover recent releases, bestselling serials, and translated works without losing the editorial tone."
            />
            <div className="grid gap-6 sm:grid-cols-2">
              {featuredStories.slice(0, 2).map((story) => (
                <StoryCard key={story.slug} story={story} />
              ))}
            </div>
          </div>

          <Card className="border-border/60 bg-card/90">
            <CardContent className="space-y-5 p-6">
              <div className="space-y-2">
                <Badge variant="outline">Why this looks different</Badge>
                <h2 className="font-heading text-2xl font-semibold tracking-tight">
                  Built to feel like a publishing product.
                </h2>
              </div>
              <div className="space-y-3 text-sm leading-6 text-muted-foreground">
                {publicPrinciples.map((principle) => (
                  <div
                    key={principle.title}
                    className="flex gap-3 rounded-2xl border border-border/60 bg-muted/20 p-4"
                  >
                    <principle.icon className="mt-0.5 size-4 shrink-0 text-primary" />
                    <div>
                      <p className="font-medium text-foreground">
                        {principle.title}
                      </p>
                      <p>{principle.description}</p>
                    </div>
                  </div>
                ))}
              </div>
              <Button asChild className="w-full" variant="outline">
                <Link href="/roadmap">
                  See the architecture plan
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        </section>

        <Separator />

        <section className="grid gap-6 lg:grid-cols-[1fr_1fr] lg:items-center">
          <div className="space-y-4">
            <SectionHeading
              eyebrow="Public access"
              title="Readers can browse, sample, and return later without friction."
              description="The public shell keeps navigation lean, while auth and reader routes remain separate for richer interactions later."
            />
            <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-muted/30 px-3 py-1.5">
                <CheckCircle2 className="size-4 text-primary" />
                Public discovery
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-muted/30 px-3 py-1.5">
                <CheckCircle2 className="size-4 text-primary" />
                Immersive reading
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-muted/30 px-3 py-1.5">
                <CheckCircle2 className="size-4 text-primary" />
                Creator-ready architecture
              </span>
            </div>
          </div>
          <Card className="border-border/60 bg-gradient-to-br from-primary/10 to-transparent">
            <CardContent className="space-y-4 p-6">
              <p className="text-xs uppercase tracking-[0.35em] text-muted-foreground">
                Next steps
              </p>
              <p className="text-sm leading-6 text-muted-foreground">
                Once the public surface is stable, we can bring in series
                personalization, filters, comments, and creator funnels without
                reworking the information architecture.
              </p>
              <div className="flex flex-wrap gap-3">
                <Button asChild>
                  <Link href="/explore">Explore now</Link>
                </Button>
                <Button asChild variant="outline">
                  <Link href="/sign-up">Join the platform</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    </PublicShell>
  );
}
