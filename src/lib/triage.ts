// Lightweight red-flag detection for the booking intake. This is NOT a
// diagnosis — it nudges people with emergency-sounding symptoms to call
// emergency services instead of waiting for a scheduled video consult.

const RED_FLAGS = [
  "chest pain",
  "can't breathe",
  "cant breathe",
  "can not breathe",
  "trouble breathing",
  "difficulty breathing",
  "shortness of breath",
  "unconscious",
  "passed out",
  "fainted",
  "stroke",
  "slurred speech",
  "face drooping",
  "severe bleeding",
  "bleeding heavily",
  "coughing blood",
  "suicidal",
  "suicide",
  "kill myself",
  "overdose",
  "seizure",
  "convulsion",
  "severe allergic",
  "anaphylaxis",
  "heart attack",
  "numbness on one side",
  "can't move",
  "choking",
];

/** True when the free-text symptoms contain an emergency red-flag phrase. */
export function hasEmergencyRedFlag(symptoms: string): boolean {
  const text = symptoms.toLowerCase();
  return RED_FLAGS.some((flag) => text.includes(flag));
}
