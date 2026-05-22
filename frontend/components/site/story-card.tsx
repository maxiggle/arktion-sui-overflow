import Link from "next/link";
import type { PublicStory } from "@/lib/public-content";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function StoryCard({ story }: { story: PublicStory }) {
  return (
    <Card className="group border-border/60 bg-card/95 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-black/5">
      <CardHeader className="space-y-4">
        <div
          className="rounded-2xl p-4 ring-1 ring-inset ring-border/60"
          style={{ backgroundImage: story.accent }}
        >
          <div className="flex items-center justify-between gap-4">
            <Badge variant="outline">{story.category}</Badge>
            <p className="text-xs text-muted-foreground">{story.status}</p>
          </div>
          <CardTitle className="mt-6 text-xl">{story.title}</CardTitle>
          <CardDescription className="mt-2 text-sm">
            {story.tagline}
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm leading-6 text-muted-foreground">
          {story.description}
        </p>
        <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
          <span>{story.chapters} chapters</span>
          <span>{story.readers} readers</span>
        </div>
        <Button asChild variant="outline" className="w-full">
          <Link href={`/series/${story.slug}`}>Open series</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
