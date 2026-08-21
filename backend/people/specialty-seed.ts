// Baseline specialty taxonomy for the multi-doctor marketplace (Phase 1).
// Two-level grouping mirrors the familiar General / Advanced Care split.
// This is the seed for the `specialties` table — grows via DB, no app release.

export type SpecialtyGroup = "general_care" | "advanced_care";

export interface SpecialtySeed {
  slug: string;
  name: string;
  group: SpecialtyGroup;
}

export const SPECIALTY_SEED: SpecialtySeed[] = [
  // --- General care ---
  { slug: "general-physician", name: "General physician", group: "general_care" },
  { slug: "womens-health", name: "Women's health", group: "general_care" },
  { slug: "skin-specialist", name: "Skin specialist", group: "general_care" },
  { slug: "child-care", name: "Child care", group: "general_care" },
  { slug: "dentist", name: "Dentist", group: "general_care" },
  { slug: "eye-specialist", name: "Eye specialist", group: "general_care" },
  { slug: "ent", name: "Ear, nose & throat", group: "general_care" },
  { slug: "mental-health", name: "Mental health", group: "general_care" },

  // --- Advanced care ---
  { slug: "bones-joints", name: "Bones & joints", group: "advanced_care" },
  { slug: "brain-nerve", name: "Brain & nerve", group: "advanced_care" },
  { slug: "urinary", name: "Urinary issues", group: "advanced_care" },
  { slug: "lungs-breathing", name: "Lungs & breathing", group: "advanced_care" },
  { slug: "heart-specialist", name: "Heart specialist", group: "advanced_care" },
  { slug: "stomach-digestion", name: "Stomach & digestion", group: "advanced_care" },
  { slug: "diabetes", name: "Diabetes management", group: "advanced_care" },
  { slug: "cancer", name: "Cancer specialist", group: "advanced_care" },
];
