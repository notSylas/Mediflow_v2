/**
 * Very soft accent washes fixed behind the page content, over the solid
 * light-grey background. Kept subtle on purpose — just enough for `.glass`
 * surfaces to read as frosted rather than flat white. Colors follow the
 * role theme (`--primary` / `--accent`), so the doctor portal glows indigo
 * and the patient portal teal.
 */
export function AmbientBackground() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="animate-float-slow absolute -top-40 -left-32 h-96 w-96 rounded-full bg-primary/8 blur-3xl" />
      <div className="animate-float-slower absolute top-1/2 -right-40 h-[26rem] w-[26rem] rounded-full bg-accent/70 blur-3xl" />
    </div>
  );
}
