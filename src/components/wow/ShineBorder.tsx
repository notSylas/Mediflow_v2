import { cn } from "@/lib/core/utils";

/**
 * Wraps content in a slowly rotating gradient "shine" border. The child should
 * have its own solid background; this provides the glowing 1px frame.
 */
export function ShineBorder({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("relative overflow-hidden rounded-2xl p-px", className)}>
      <span
        aria-hidden
        className="animate-shine-spin pointer-events-none absolute left-1/2 top-1/2 h-[180%] w-[180%] -translate-x-1/2 -translate-y-1/2 motion-reduce:hidden"
        style={{
          background:
            "conic-gradient(from 0deg, transparent 0deg, var(--primary) 70deg, transparent 150deg, transparent 360deg)",
        }}
      />
      <div className="relative rounded-[calc(1rem-1px)] bg-card">{children}</div>
    </div>
  );
}
