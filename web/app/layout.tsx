import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

// "Premium Clinical Glass" direction (docs/Design.md, via /design-consultation):
// one family, many weights — Geist for both headings and body (replacing the
// previous Figtree/Noto Sans pairing). Loaded once; globals.css aliases
// --font-heading to the same variable so existing `font-heading` Tailwind
// usages (card.tsx, alert-dialog.tsx) keep working unchanged.
const geist = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "MediFlow — Your doctor's clinic, online",
  description:
    "Book a guaranteed slot, consult your doctor over video, and keep every prescription in one place.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geist.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        <Toaster richColors position="top-right" closeButton />
      </body>
    </html>
  );
}
