import { Card, CardContent } from "@/components/ui/card";
import { SectionHeading } from "@/components/site/section-heading";

export default function Page() {
  return (
    <div className="mx-auto w-full max-w-5xl space-y-8 px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
      <SectionHeading
        eyebrow="Privacy"
        title="We keep the privacy page readable, not legalese-heavy."
        description="This is a placeholder policy structure for the public-first product. Replace these sections with your final legal copy later."
      />

      <div className="grid gap-6">
        {[
          [
            "What we collect",
            "Account details, reading activity, and content interactions necessary to run the platform.",
          ],
          [
            "How we use it",
            "To personalize discovery, preserve reading state, and support creator and moderation features.",
          ],
          [
            "Your controls",
            "We should expose meaningful account, export, and privacy controls once the user system is finalized.",
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
