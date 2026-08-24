"use client";

import { useEffect, useState } from "react";
import { Droplet, Ear, Eye, FlaskConical, Pill, SprayCan, Syringe } from "lucide-react";
import { Input } from "@/components/ui/input";

export interface MedicineSuggestion {
  name: string;
  strengths: string[];
  route: string | null;
  klass: string | null;
  manufacturer: string | null;
  composition: string | null;
}

// Dosage-form / route filler words the real catalog appends to a brand name,
// e.g. "Dolo 650 Tablet" or "Augmentin Duo Oral Suspension" — stripped off
// (from the end, possibly more than one) so what's left reads like what a
// doctor actually writes: the brand name and its number.
const FILLER_WORDS = new Set([
  "tablet", "tablets", "capsule", "capsules", "syrup", "injection", "cream",
  "ointment", "gel", "lotion", "drops", "solution", "suspension", "spray",
  "inhaler", "powder", "sachet", "patch", "suppository", "lozenge", "soap",
  "shampoo", "mouthwash", "infusion", "implant", "granules", "chewable",
  "effervescent", "oral",
]);

/**
 * "Dolo 650 Tablet" + "Paracetamol (650mg)" -> { name: "Dolo", strength:
 * "650mg" }. The name always gets its bare number pulled out (so the name
 * stays short and doesn't repeat the strength), but the strength itself
 * comes from `composition`'s parenthetical dose(s) whenever available —
 * e.g. a combination product "Amoxycillin (500mg) + Clavulanic Acid
 * (125mg)" produces `"500mg + 125mg"`, joining every dose found, not just
 * the first. A wrong/missing unit on a prescribed strength is a real
 * safety risk (mg vs mcg vs IU), so this never guesses a unit — the bare
 * number pulled from the name is only used as a last-resort fallback when
 * `composition` has nothing to offer.
 */
export function simplifyMedicineName(
  rawName: string,
  composition: string | null | undefined
): { name: string; strength: string } {
  const words = rawName.trim().split(/\s+/);
  while (words.length > 1 && FILLER_WORDS.has(words[words.length - 1].toLowerCase())) {
    words.pop();
  }
  const numIndex = words.findIndex((w) => /^[\d.]+$/.test(w));
  const bareNumber = numIndex !== -1 ? words[numIndex] : "";
  if (numIndex !== -1) words.splice(numIndex, 1);

  const composedStrength = composition
    ? [...composition.matchAll(/\(([^)]+)\)/g)].map((m) => m[1].trim()).join(" + ")
    : "";

  return { name: words.join(" ") || rawName, strength: composedStrength || bareNumber };
}

// Dosage-form keywords found in the product name, ranked by how common each
// actually is in the imported ~250K-row catalog — covers the vast majority
// of real rows; anything else (patch, suppository, powder, ...) falls back
// to the generic pill icon rather than growing this list for rare forms.
const FORM_ICONS: Array<{ pattern: RegExp; Icon: typeof Pill }> = [
  { pattern: /\b(injection|infusion|implant)\b/i, Icon: Syringe },
  { pattern: /\b(syrup|suspension|solution)\b/i, Icon: Droplet },
  { pattern: /\b(cream|ointment|gel|lotion)\b/i, Icon: FlaskConical },
  { pattern: /\b(spray|nasal|inhaler)\b/i, Icon: SprayCan },
  { pattern: /\beye\b/i, Icon: Eye },
  { pattern: /\bear\b/i, Icon: Ear },
];

function formIcon(name: string): typeof Pill {
  return FORM_ICONS.find(({ pattern }) => pattern.test(name))?.Icon ?? Pill;
}

/**
 * Medicine name input with a live formulary dropdown, backed by the same
 * `GET /api/medicines` search the mobile app already uses
 * (mobile/src/components/medicine-autocomplete.tsx is the reference
 * pattern). No bundled offline fallback here — unlike mobile, web always
 * has a connection, so there's no gap to fill while a request is in
 * flight.
 */
export function MedicineNameField({
  value,
  onChangeText,
  onSelect,
  "aria-label": ariaLabel,
}: {
  value: string;
  onChangeText: (value: string) => void;
  onSelect: (entry: MedicineSuggestion) => void;
  "aria-label"?: string;
}) {
  const [focused, setFocused] = useState(false);
  const [suggestions, setSuggestions] = useState<MedicineSuggestion[]>([]);

  useEffect(() => {
    const query = value.trim();
    if (!focused || query.length < 2) {
      // Clearing stale suggestions when the field blurs or the query drops
      // below the search threshold — a real state transition driven by
      // this effect's own dependencies, not a cascading-render loop.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSuggestions([]);
      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(() => {
      fetch(`/api/medicines?q=${encodeURIComponent(query)}`, { signal: controller.signal })
        .then((res) => (res.ok ? res.json() : null))
        .then((data: { medicines: MedicineSuggestion[] } | null) => {
          setSuggestions(data?.medicines ?? []);
        })
        .catch(() => {
          // Aborted (superseded by a newer keystroke) or a network blip —
          // either way, just leave the last-known suggestions in place.
        });
    }, 200);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [value, focused]);

  const open = focused && suggestions.length > 0;

  return (
    <div className="relative">
      <Input
        aria-label={ariaLabel}
        placeholder="Medicine name"
        value={value}
        onChange={(e) => onChangeText(e.target.value)}
        onFocus={() => setFocused(true)}
        // Delay so a suggestion click registers before the list closes.
        onBlur={() => setTimeout(() => setFocused(false), 140)}
        autoComplete="off"
      />
      {open ? (
        <div className="absolute z-10 mt-1.5 max-h-72 w-full overflow-y-auto rounded-xl border bg-card shadow-md">
          {suggestions.map((entry, i) => {
            const Icon = formIcon(entry.name);
            return (
              <button
                key={entry.name}
                type="button"
                onClick={() => {
                  onSelect(entry);
                  setFocused(false);
                }}
                className={`flex w-full items-start gap-2.5 px-3 py-2.5 text-left text-sm hover:bg-accent ${
                  i > 0 ? "border-t" : ""
                } odd:bg-background/40`}
              >
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Icon className="h-3.5 w-3.5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{entry.name}</span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {entry.composition || entry.klass || "Medicine"}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
