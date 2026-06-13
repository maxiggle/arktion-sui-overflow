import { CreatorsSection } from "@/components/site/creators-section";
import { HeroSection } from "@/components/site/hero-section";
import { LandingNav } from "@/components/site/landing-nav";
import { PaymentsSection } from "@/components/site/payments-section";
import { ProblemSection } from "@/components/site/problem-section";
import { TranslatorsSection } from "@/components/site/translators-section";

export default function Home() {
  return (
    <>
      <LandingNav />
      <main className="bg-black">
        <HeroSection />
        <ProblemSection />
        <CreatorsSection />
        <TranslatorsSection />
        <PaymentsSection />
      </main>
    </>
  );
}
