import type { ReactNode } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type RouteStateProps = {
  badge: string;
  title: string;
  description: string;
  details?: string;
  children?: ReactNode;
};

export function RouteState({
  badge,
  title,
  description,
  details,
  children,
}: RouteStateProps) {
  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-6 py-16">
      <Card className="w-full max-w-2xl border-border/60 bg-card/90 shadow-sm backdrop-blur">
        <CardHeader className="gap-3 border-b border-border/60">
          <Badge variant="outline" className="w-fit">
            {badge}
          </Badge>
          <CardTitle className="text-2xl sm:text-3xl">{title}</CardTitle>
          <CardDescription className="max-w-xl text-base leading-7">
            {description}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 pt-2">
          {details ? (
            <p className="rounded-lg border border-dashed border-border/70 bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
              {details}
            </p>
          ) : null}
          {children}
        </CardContent>
      </Card>
    </div>
  );
}
