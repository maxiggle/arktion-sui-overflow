"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";

/**
 * Auth guard for all protected routes.
 *
 * /read/* is intentionally excluded: chapter reading is open to guests.
 * They can read freely but won't earn INK or have progress tracked.
 */
export default function ProtectedLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const isReadRoute = pathname.startsWith("/read/");

  useEffect(() => {
    if (!isLoading && !isAuthenticated && !isReadRoute) {
      router.replace("/sign-in");
    }
  }, [isLoading, isAuthenticated, isReadRoute, router]);

  if (isLoading) {
    return (
      <div className="grid min-h-screen place-items-center bg-black">
        <span className="block h-5 w-5 rounded-full border-2 border-white/15 border-t-white/60 animate-spin" />
      </div>
    );
  }

  // Guests land here only via /read/* — render children directly.
  if (!isAuthenticated) {
    return isReadRoute ? <>{children}</> : null;
  }

  return <main className="min-h-screen bg-background">{children}</main>;
}
