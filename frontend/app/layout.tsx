import type { Metadata } from "next";
import { Outfit, Readex_Pro, Space_Grotesk, Space_Mono } from "next/font/google";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/contexts/auth-context";
import "./globals.css";

const readexPro = Readex_Pro({
  variable: "--font-readex",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-heading",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const outfit = Outfit({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const spaceMono = Space_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Arktion",
  description:
    "A branded Next.js design system with shadcn/ui and custom fonts.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${readexPro.variable} ${spaceGrotesk.variable} ${outfit.variable} ${spaceMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col font-body bg-background text-foreground">
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
          <AuthProvider>{children}</AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
