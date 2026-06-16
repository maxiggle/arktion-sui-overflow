"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useCreatorStore } from "@/stores/creator.store";
import { CreatorShell } from "@/components/creator/creator-shell";

export default function CreatorLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const pathname = usePathname();
  const router = useRouter();
  const { creatorStatus, applicationChecked, applicationLoading, checkApplicationStatus } =
    useCreatorStore();

  const isApplyPage = pathname === "/creator/apply";

  useEffect(() => {
    checkApplicationStatus();
  }, [checkApplicationStatus]);

  useEffect(() => {
    if (!applicationChecked || applicationLoading) return;

    if (creatorStatus !== "APPROVED" && !isApplyPage) {
      router.replace("/creator/apply");
    }
  }, [applicationChecked, applicationLoading, creatorStatus, isApplyPage, router]);

  // Apply page renders without the creator shell (it's a standalone onboarding screen)
  if (isApplyPage) {
    return <>{children}</>;
  }

  // Show nothing while we're checking — avoids a flash of the dashboard before redirect
  if (!applicationChecked || applicationLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="h-5 w-5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  if (creatorStatus !== "APPROVED") {
    return null;
  }

  return <CreatorShell>{children}</CreatorShell>;
}
