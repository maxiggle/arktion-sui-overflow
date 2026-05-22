import { Crown, Compass, Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { SectionHeading } from "@/components/site/section-heading";
import { publicPrinciples } from "@/lib/public-content";

export default function Page() {
  return (
    <div className="mx-auto w-full max-w-7xl space-y-12 px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
      <SectionHeading
        eyebrow="About Arktion"
        title="A storytelling platform with a real editorial identity."
        description="Arktion is being shaped as a layered product: public discovery, immersive reading, creator tools, and admin systems — each with a distinct route and visual role."
      />

      <div className="grid gap-6 lg:grid-cols-3">
        {publicPrinciples.map((principle) => (
          <Card key={principle.title} className="border-border/60 bg-card/90">
            <CardContent className="space-y-4 p-6">
              <principle.icon className="size-5 text-primary" />
              <h2 className="font-heading text-lg font-semibold">
                {principle.title}
              </h2>
              <p className="text-sm leading-6 text-muted-foreground">
                {principle.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        <Card className="border-border/60 bg-card/90">
          <CardContent className="space-y-4 p-6">
            <Compass className="size-5 text-primary" />
            <h2 className="font-heading text-xl font-semibold">
              Route clarity matters
            </h2>
            <p className="text-sm leading-6 text-muted-foreground">
              Public pages live on public routes, auth callbacks stay
              chrome-free, reader pages get their own layout, and creator/admin
              stay isolated.
            </p>
          </CardContent>
        </Card>
        <Card className="border-border/60 bg-card/90">
          <CardContent className="space-y-4 p-6">
            <Sparkles className="size-5 text-primary" />
            <h2 className="font-heading text-xl font-semibold">
              Design should feel authored
            </h2>
            <p className="text-sm leading-6 text-muted-foreground">
              The visual system uses editorial spacing, warm surfaces, and
              custom composition so the app feels more like a publication than a
              dashboard.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
