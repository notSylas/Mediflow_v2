import { GitCommitHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Shows which commit is actually running, for testers reporting bugs against a
 * deployed environment ("it repros on 4f2a1c9").
 *
 * The values are baked into the container image at build time by
 * Dockerfile.web, so they describe the running build rather than whatever the
 * deploy step was told. Locally they're unset and this renders "dev".
 */
export function BuildInfo({ className }: { className?: string }) {
  const sha = process.env.COMMIT_SHA;
  const short = sha ? sha.slice(0, 7) : "dev";
  const branch = process.env.COMMIT_REF;
  const builtAt = process.env.BUILD_TIME;

  const title = [
    sha ? `commit ${sha}` : "local development build",
    branch ? `branch ${branch}` : null,
    builtAt ? `built ${builtAt}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  return (
    <p
      title={title}
      className={cn("flex items-center gap-1.5 font-mono text-[11px]", className)}
    >
      <GitCommitHorizontal className="h-3.5 w-3.5 shrink-0" aria-hidden />
      <span className="sr-only">Deployed build:</span>
      <span className="tabular-nums">{short}</span>
      {branch && <span className="opacity-70">· {branch}</span>}
    </p>
  );
}
