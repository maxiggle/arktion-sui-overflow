import React from "react";
import { ReaderShell } from "@/components/dashboard/reader-shell";

export default function ReaderLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <ReaderShell>{children}</ReaderShell>;
}
