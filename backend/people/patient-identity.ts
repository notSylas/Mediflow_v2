export function patientDocumentName(user: {
  name?: string | null;
  email: string;
}): string {
  return patientEditableName(user) || "Not recorded";
}

export function patientEditableName(user: {
  name?: string | null;
  email: string;
}): string {
  const name = user.name?.trim();
  if (!name) return "";

  const normalizedName = name.toLowerCase();
  const normalizedEmail = user.email.trim().toLowerCase();

  if (normalizedName === normalizedEmail || normalizedName.includes("@")) {
    return "";
  }

  return name;
}
