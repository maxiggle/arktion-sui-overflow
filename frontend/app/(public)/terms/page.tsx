import { Card, CardContent } from "@/components/ui/card";
import { SectionHeading } from "@/components/site/section-heading";

export default function Page() {
  return (
    <div className="mx-auto w-full max-w-5xl space-y-8 px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
      <SectionHeading
        eyebrow="Terms"
        title="Terms that match the product shape."
        description="These are architectural placeholders for now; the final version should be concise, clear, and tied to the actual product flows."
      />

      <div className="grid gap-6">
        {[
          [
            "Account responsibility",
            "Users are responsible for their credentials, uploads, and activity on the platform.",
          ],
          [
            "Content rights",
            "Creators retain their rights according to the publication and licensing model that ships later.",
          ],
          [
            "Platform behavior",
            "We can define moderation, access restrictions, and acceptable use once the product rules are finalized.",
          ],
        ].map(([title, body]) => (
          <Card key={title} className="border-border/60 bg-card/90">
            <CardContent className="space-y-2 p-6">
              <h2 className="font-heading text-lg font-semibold">{title}</h2>
              <p className="text-sm leading-7 text-muted-foreground">{body}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
