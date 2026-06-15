"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";

/**
 * Auth guard for all protected routes.
 *
 * Renders a full-screen spinner while the auth context is resolving the
 * stored token. Once resolved:
 *   - authenticated   → render children
 *   - unauthenticated → redirect to /sign-in
 */
export default function ProtectedLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/sign-in");
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading) {
    return (
      <div className="grid min-h-screen place-items-center bg-black">
        <span className="block h-5 w-5 rounded-full border-2 border-white/15 border-t-white/60 animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    // Render nothing while redirect fires
    return null;
  }

  return <main className="min-h-screen bg-background">{children}</main>;
}
