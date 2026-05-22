import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Sparkles } from "lucide-react";
import Link from "next/link";

export function PublicPageHero({
  title,
  subtitle,
  primaryHref,
  primaryLabel,
  secondaryHref,
  secondaryLabel,
}: {
  title: string;
  subtitle: string;
  primaryHref: string;
  primaryLabel: string;
  secondaryHref: string;
  secondaryLabel: string;
}) {
  return (
    <section className="relative overflow-hidden border-b border-border/60">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,rgba(249,115,22,0.14),transparent_35%),radial-gradient(circle_at_top_right,rgba(59,130,246,0.12),transparent_30%)]" />
      <div className="mx-auto grid w-full max-w-7xl gap-10 px-4 py-20 sm:px-6 lg:grid-cols-[1.2fr_0.8fr] lg:px-8 lg:py-28">
        <div className="max-w-3xl space-y-8">
          <Badge variant="outline" className="w-fit gap-2 px-3 py-1.5">
            <Sparkles className="size-3.5" />
            Public surface
          </Badge>
          <div className="space-y-5">
            <h1 className="font-heading text-4xl font-semibold tracking-tight sm:text-5xl lg:text-7xl">
              {title}
            </h1>
            <p className="max-w-2xl text-base leading-8 text-muted-foreground sm:text-lg">
              {subtitle}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button asChild size="lg">
              <Link href={primaryHref}>
                {primaryLabel}
                <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href={secondaryHref}>{secondaryLabel}</Link>
            </Button>
          </div>
        </div>

        <div className="grid gap-4 self-center rounded-[2rem] border border-border/60 bg-card/90 p-5 shadow-2xl shadow-black/5 backdrop-blur">
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-2xl border border-border/60 bg-muted/40 p-4">
              <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                Reading
              </p>
              <p className="mt-3 font-heading text-2xl font-semibold">
                Immersive
              </p>
            </div>
            <div className="rounded-2xl border border-border/60 bg-muted/40 p-4">
              <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                Discovery
              </p>
              <p className="mt-3 font-heading text-2xl font-semibold">
                Curated
              </p>
            </div>
          </div>
          <div className="rounded-2xl border border-border/60 bg-gradient-to-br from-primary/10 to-transparent p-4">
            <p className="text-sm leading-6 text-muted-foreground">
              Arktion’s public pages are designed like an editorial product, not
              a generic SaaS dashboard.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
