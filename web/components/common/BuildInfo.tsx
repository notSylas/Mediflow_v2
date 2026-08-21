import { formatInTimeZone } from "date-fns-tz";

/**
 * Tester reference badge: which commit is running, when it was deployed, and
 * who deployed it — so a bug report can name a build ("repros on 4f2a1c9").
 *
 * Values are baked into the container image at build time (see Dockerfile.web
 * and .github/workflows/deploy.yml), so they describe the running build rather
 * than whatever the deploy step was told. Unset locally, where it reads "dev".
 *
 * Rendered in the doctor's timezone, matching how every other timestamp in the
 * app is displayed (docs/Design.md).
 */
const TIMEZONE = "Asia/Kolkata";

export function BuildInfo() {
  const sha = process.env.COMMIT_SHA;
  const short = sha ? sha.slice(0, 7) : "dev";
  const deployedBy = process.env.DEPLOYED_BY;
  const builtAt = process.env.BUILD_TIME;

  let when: string | null = null;
  if (builtAt) {
    const parsed = new Date(builtAt);
    if (!Number.isNaN(parsed.getTime())) {
      when = `${formatInTimeZone(parsed, TIMEZONE, "d MMM yyyy, h:mm a")} IST`;
    }
  }

  return (
    <div
      // Fixed to the viewport corner so it is visible on every screen size,
      // including phones where the login card's brand panel is hidden.
      className="fixed right-3 top-3 z-50 rounded-md bg-white/75 px-2.5 py-1.5 text-right font-mono text-[11px] font-bold leading-tight text-black backdrop-blur-sm"
      title={sha ? `commit ${sha}` : "local development build"}
    >
      <span className="sr-only">Deployed build: </span>
      <span className="block tabular-nums">{short}</span>
      {when && <span className="block tabular-nums">{when}</span>}
      {deployedBy && <span className="block">by {deployedBy}</span>}
    </div>
  );
}
