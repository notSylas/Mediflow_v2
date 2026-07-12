import { AmbientBackground } from "@/components/effects/AmbientBackground";

export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="relative flex flex-1 items-center justify-center px-4 py-10">
      <AmbientBackground />
      {children}
    </div>
  );
}
