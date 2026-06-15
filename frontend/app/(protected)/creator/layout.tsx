import { CreatorShell } from "@/components/creator/creator-shell";

export default function CreatorLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <CreatorShell>{children}</CreatorShell>;
}
