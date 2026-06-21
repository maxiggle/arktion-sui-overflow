import Link from "next/link";
import { publicNavItems } from "@/lib/public-content";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { PublicMobileNav } from "@/components/site/public-mobile-nav";
import { PublicHeaderActions } from "@/components/site/auth-nav-actions";

/** Public Mintlify documentation site. */
const DOCS_URL = "https://arktion.mintlify.app";

export function PublicShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-3">
            <span className="flex size-9 items-center justify-center rounded-xl bg-primary text-sm font-semibold text-primary-foreground shadow-sm shadow-primary/20">
              A
            </span>
            <div className="leading-tight">
              <p className="font-heading text-sm font-semibold tracking-[0.2em] uppercase">
                Arktion
              </p>
              <p className="text-xs text-muted-foreground">
                Stories, creators, and worlds
              </p>
            </div>
          </Link>

          <nav className="hidden items-center gap-1 md:flex">
            {publicNavItems.map((item) => (
              <Button key={item.href} asChild variant="ghost" size="sm">
                <Link href={item.href}>{item.label}</Link>
              </Button>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <PublicMobileNav />
            <PublicHeaderActions />
          </div>
        </div>
      </header>

      <main>{children}</main>

      <footer className="border-t border-border/60">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-10 sm:px-6 lg:px-8">
          <div className="grid gap-6 md:grid-cols-[2fr_1fr_1fr]">
            <div className="space-y-3">
              <p className="font-heading text-lg font-semibold">Arktion</p>
              <p className="max-w-xl text-sm leading-6 text-muted-foreground">
                A distinct reading and creator platform with route architecture
                that stays sane as it grows.
              </p>
            </div>
            <div className="space-y-3 text-sm">
              <p className="font-medium">Navigate</p>
              <div className="flex flex-col gap-2 text-muted-foreground">
                <Link href="/explore">Explore</Link>
                <Link href="/roadmap">Roadmap</Link>
                <Link href="/about">About</Link>
              </div>
            </div>
            <div className="space-y-3 text-sm">
              <p className="font-medium">Resources</p>
              <div className="flex flex-col gap-2 text-muted-foreground">
                <a
                  href={DOCS_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="transition-colors hover:text-foreground"
                >
                  Docs
                </a>
                <Link href="/privacy">Privacy</Link>
                <Link href="/terms">Terms</Link>
              </div>
            </div>
          </div>
          <Separator />
          <p className="text-xs text-muted-foreground">
            Built for public storytelling first, with creator and admin surfaces
            layered on top.
          </p>
        </div>
      </footer>
    </div>
  );
}
