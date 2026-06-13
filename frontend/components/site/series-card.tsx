import Link from "next/link";
import Image from "next/image";
import { BookOpen } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FORMAT_LABELS } from "@/lib/types/series";
import type { SeriesDto } from "@/lib/types/series";

export function SeriesCard({ series }: { series: SeriesDto }) {
  const formatLabel = FORMAT_LABELS[series.formatType] ?? "Series";

  return (
    <Card className="group border-border/60 bg-card/95 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-black/5 overflow-hidden">
      <div className="relative h-48 w-full bg-muted border-b border-border/40 flex items-center justify-center overflow-hidden">
        {series.coverUrl ? (
          <Image
            src={series.coverUrl}
            alt={series.title}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
          />
        ) : (
          <BookOpen
            className="h-10 w-10 text-muted-foreground/30"
            strokeWidth={1}
          />
        )}
        <div className="absolute top-3 left-3 flex gap-2">
          <Badge variant="secondary" className="text-xs">
            {formatLabel}
          </Badge>
          {series.status && (
            <Badge variant="outline" className="text-xs capitalize bg-background/80 backdrop-blur-sm">
              {series.status}
            </Badge>
          )}
        </div>
      </div>
      <CardHeader className="pb-2 pt-4">
        <CardTitle className="text-base leading-snug line-clamp-2">
          {series.title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {series.description && (
          <p className="text-sm leading-6 text-muted-foreground line-clamp-3">
            {series.description}
          </p>
        )}
        <Button asChild variant="outline" className="w-full">
          <Link href={`/series/${series.id}`}>Open series</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
