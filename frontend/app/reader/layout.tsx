import { GuestReadBanner } from "@/components/reader/guest-read-banner";

export default function ReaderLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <main className="min-h-dvh bg-black text-white">
      {children}
      <GuestReadBanner />
    </main>
  );
}
