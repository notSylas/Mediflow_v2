import type { Metadata } from "next";

// Static and generic on purpose — this route is the Rules.md #11 no-session
// exception (a receiving doctor has no account), so it's publicly fetchable
// by link-unfurl crawlers (WhatsApp/iMessage/Slack) *without* the share code
// ever being entered. Nothing here may depend on the `?code=` query param or
// any decrypted bundle content: doing so would mean a crawler's HEAD/GET
// request — not the intended recipient — is what actually "views" the
// share, silently burning it and leaking patient data to a bot.
export const metadata: Metadata = {
  title: "Shared health record · MediFlow",
  description:
    "Someone has shared a MediFlow health record with you. Open the link and enter the code to view it — no account needed.",
  openGraph: {
    title: "Shared health record · MediFlow",
    description: "You've been sent a health record via MediFlow. Tap to view it.",
    type: "website",
  },
  robots: { index: false, follow: false },
};

export default function VaultViewLayout({ children }: { children: React.ReactNode }) {
  return children;
}
