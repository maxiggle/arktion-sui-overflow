import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, BookOpen, Clock3, Users } from "lucide-react";
import { featuredStories } from "@/lib/public-content";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

type SeriesPageProps = {
  params: Promise<{ slug: string }>;
};

export default async function Page({ params }: SeriesPageProps) {
  const { slug } = await params;
  const story = featuredStories.find((entry) => entry.slug === slug);

  if (!story) {
    notFound();
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
      <div className="grid gap-10 lg:grid-cols-[1.15fr_0.85fr] lg:items-start">
        <div className="space-y-6">
          <Badge variant="outline" className="w-fit px-3 py-1.5">
            {story.category}
          </Badge>
          <div className="space-y-4">
            <h1 className="font-heading text-4xl font-semibold tracking-tight sm:text-6xl">
              {story.title}
            </h1>
            <p className="max-w-2xl text-base leading-8 text-muted-foreground sm:text-lg">
              {story.description}
            </p>
          </div>
          <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-card/80 px-3 py-1.5">
              <BookOpen className="size-4 text-primary" />
              {story.chapters} chapters
            </span>
            <span className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-card/80 px-3 py-1.5">
              <Users className="size-4 text-primary" />
              {story.readers} readers
            </span>
            <span className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-card/80 px-3 py-1.5">
              <Clock3 className="size-4 text-primary" />
              {story.status}
            </span>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link href={`/reader/${story.slug}/1`}>
                Start reading
                <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/explore">Back to explore</Link>
            </Button>
          </div>
        </div>

        <Card className="border-border/60 bg-card/90 shadow-lg shadow-black/5">
          <CardContent className="space-y-4 p-6">
            <div className="rounded-[1.5rem] bg-gradient-to-br from-primary/15 to-transparent p-6 ring-1 ring-border/60">
              <p className="text-xs uppercase tracking-[0.35em] text-muted-foreground">
                Series note
              </p>
              <p className="mt-4 text-sm leading-7 text-muted-foreground">
                This detail page is intentionally editorial: one title, one
                summary, one clean path into reading.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-border/60 bg-muted/20 p-4">
                <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                  Release style
                </p>
                <p className="mt-2 font-medium">
                  Designed for serialized fiction
                </p>
              </div>
              <div className="rounded-2xl border border-border/60 bg-muted/20 p-4">
                <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                  Access
                </p>
                <p className="mt-2 font-medium">
                  Public preview, reader handoff
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
