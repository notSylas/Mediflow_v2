/**
 * Static gradient for the login brand panel. Matches the calmer
 * glass-hero pattern (docs/Design.md) used on the booking-confirmation and
 * doctor-dashboard hero cards: one gradient + one soft corner highlight, no
 * drifting blobs or cursor-tracking motion. Server component — no client JS.
 *
 * `variant` follows the role identity colors (docs/Design.md): the patient
 * surface leads cobalt and resolves toward violet; the doctor surface leads
 * violet so the clinic sign-in reads as the staff space at a glance.
 */
export function AuthHeroPanel({ variant = "patient" }: { variant?: "patient" | "doctor" }) {
  const gradient =
    variant === "doctor"
      ? "linear-gradient(135deg, oklch(0.42 0.2 303) 0%, oklch(0.44 0.2 285) 55%, oklch(0.46 0.19 268) 100%)"
      : "linear-gradient(135deg, oklch(0.46 0.19 258) 0%, oklch(0.44 0.2 280) 50%, oklch(0.42 0.2 303) 100%)";

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute inset-0" style={{ background: gradient }} />
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at 85% -15%, color-mix(in oklch, white 35%, transparent), transparent 55%), radial-gradient(circle at -10% 110%, color-mix(in oklch, black 25%, transparent), transparent 50%)",
        }}
      />
    </div>
  );
}
