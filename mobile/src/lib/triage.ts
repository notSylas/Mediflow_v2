const RED_FLAGS = [
  "chest pain",
  "can't breathe",
  "cant breathe",
  "trouble breathing",
  "difficulty breathing",
  "shortness of breath",
  "unconscious",
  "passed out",
  "stroke",
  "slurred speech",
  "severe bleeding",
  "suicidal",
  "overdose",
  "seizure",
  "anaphylaxis",
  "heart attack",
  "choking",
];

export function hasEmergencyRedFlag(value: string): boolean {
  const normalized = value.toLowerCase();
  return RED_FLAGS.some((phrase) => normalized.includes(phrase));
}
