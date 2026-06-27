/**
 * Curated offline formulary of common India-market medicines for the
 * prescription autocomplete. Names are generics (with a few common brands);
 * strengths are typical adult oral forms. This is a typing aid, not clinical
 * guidance — the doctor confirms every choice.
 */
export interface FormularyEntry {
  name: string;
  strengths: string[];
  route: string;
  klass: string;
}

const O = "oral";

export const FORMULARY: FormularyEntry[] = [
  // Analgesics / antipyretics / NSAIDs
  { name: "Paracetamol", strengths: ["500 mg", "650 mg", "1 g"], route: O, klass: "Analgesic" },
  { name: "Ibuprofen", strengths: ["200 mg", "400 mg", "600 mg"], route: O, klass: "NSAID" },
  { name: "Diclofenac", strengths: ["50 mg", "75 mg SR"], route: O, klass: "NSAID" },
  { name: "Aceclofenac", strengths: ["100 mg", "200 mg SR"], route: O, klass: "NSAID" },
  { name: "Naproxen", strengths: ["250 mg", "500 mg"], route: O, klass: "NSAID" },
  { name: "Aspirin", strengths: ["75 mg", "150 mg", "325 mg"], route: O, klass: "NSAID" },
  { name: "Mefenamic acid", strengths: ["250 mg", "500 mg"], route: O, klass: "NSAID" },
  { name: "Tramadol", strengths: ["50 mg", "100 mg"], route: O, klass: "Analgesic" },
  { name: "Ketorolac", strengths: ["10 mg"], route: O, klass: "NSAID" },
  { name: "Etoricoxib", strengths: ["60 mg", "90 mg", "120 mg"], route: O, klass: "NSAID" },

  // Antibiotics
  { name: "Amoxicillin", strengths: ["250 mg", "500 mg"], route: O, klass: "Antibiotic" },
  { name: "Amoxicillin + Clavulanate", strengths: ["375 mg", "625 mg"], route: O, klass: "Antibiotic" },
  { name: "Azithromycin", strengths: ["250 mg", "500 mg"], route: O, klass: "Antibiotic" },
  { name: "Cephalexin", strengths: ["250 mg", "500 mg"], route: O, klass: "Antibiotic" },
  { name: "Cefixime", strengths: ["100 mg", "200 mg"], route: O, klass: "Antibiotic" },
  { name: "Cefpodoxime", strengths: ["100 mg", "200 mg"], route: O, klass: "Antibiotic" },
  { name: "Ciprofloxacin", strengths: ["250 mg", "500 mg"], route: O, klass: "Antibiotic" },
  { name: "Levofloxacin", strengths: ["250 mg", "500 mg"], route: O, klass: "Antibiotic" },
  { name: "Ofloxacin", strengths: ["200 mg"], route: O, klass: "Antibiotic" },
  { name: "Norfloxacin", strengths: ["400 mg"], route: O, klass: "Antibiotic" },
  { name: "Doxycycline", strengths: ["100 mg"], route: O, klass: "Antibiotic" },
  { name: "Metronidazole", strengths: ["200 mg", "400 mg"], route: O, klass: "Antibiotic" },
  { name: "Clarithromycin", strengths: ["250 mg", "500 mg"], route: O, klass: "Antibiotic" },
  { name: "Nitrofurantoin", strengths: ["100 mg"], route: O, klass: "Antibiotic" },
  { name: "Cotrimoxazole", strengths: ["480 mg", "960 mg"], route: O, klass: "Antibiotic" },
  { name: "Faropenem", strengths: ["200 mg"], route: O, klass: "Antibiotic" },

  // Antihistamines / anti-allergy
  { name: "Cetirizine", strengths: ["5 mg", "10 mg"], route: O, klass: "Antihistamine" },
  { name: "Levocetirizine", strengths: ["5 mg"], route: O, klass: "Antihistamine" },
  { name: "Loratadine", strengths: ["10 mg"], route: O, klass: "Antihistamine" },
  { name: "Fexofenadine", strengths: ["120 mg", "180 mg"], route: O, klass: "Antihistamine" },
  { name: "Chlorpheniramine", strengths: ["4 mg"], route: O, klass: "Antihistamine" },
  { name: "Hydroxyzine", strengths: ["10 mg", "25 mg"], route: O, klass: "Antihistamine" },
  { name: "Montelukast", strengths: ["4 mg", "5 mg", "10 mg"], route: O, klass: "Anti-asthmatic" },

  // GI — PPIs, antacids, antiemetics, antispasmodics
  { name: "Omeprazole", strengths: ["20 mg", "40 mg"], route: O, klass: "PPI" },
  { name: "Pantoprazole", strengths: ["20 mg", "40 mg"], route: O, klass: "PPI" },
  { name: "Esomeprazole", strengths: ["20 mg", "40 mg"], route: O, klass: "PPI" },
  { name: "Rabeprazole", strengths: ["10 mg", "20 mg"], route: O, klass: "PPI" },
  { name: "Ranitidine", strengths: ["150 mg", "300 mg"], route: O, klass: "H2 blocker" },
  { name: "Famotidine", strengths: ["20 mg", "40 mg"], route: O, klass: "H2 blocker" },
  { name: "Domperidone", strengths: ["10 mg"], route: O, klass: "Antiemetic" },
  { name: "Ondansetron", strengths: ["4 mg", "8 mg"], route: O, klass: "Antiemetic" },
  { name: "Sucralfate", strengths: ["1 g"], route: O, klass: "Antacid" },
  { name: "Dicyclomine", strengths: ["10 mg", "20 mg"], route: O, klass: "Antispasmodic" },
  { name: "Drotaverine", strengths: ["40 mg", "80 mg"], route: O, klass: "Antispasmodic" },
  { name: "Loperamide", strengths: ["2 mg"], route: O, klass: "Antidiarrhoeal" },
  { name: "Lactulose", strengths: ["10 g/15 ml"], route: O, klass: "Laxative" },
  { name: "Bisacodyl", strengths: ["5 mg"], route: O, klass: "Laxative" },
  { name: "Ursodeoxycholic acid", strengths: ["150 mg", "300 mg"], route: O, klass: "Hepatic" },

  // Cardiovascular / antihypertensives
  { name: "Amlodipine", strengths: ["2.5 mg", "5 mg", "10 mg"], route: O, klass: "Antihypertensive" },
  { name: "Telmisartan", strengths: ["20 mg", "40 mg", "80 mg"], route: O, klass: "Antihypertensive" },
  { name: "Losartan", strengths: ["25 mg", "50 mg"], route: O, klass: "Antihypertensive" },
  { name: "Olmesartan", strengths: ["20 mg", "40 mg"], route: O, klass: "Antihypertensive" },
  { name: "Ramipril", strengths: ["2.5 mg", "5 mg"], route: O, klass: "Antihypertensive" },
  { name: "Enalapril", strengths: ["5 mg", "10 mg"], route: O, klass: "Antihypertensive" },
  { name: "Metoprolol", strengths: ["25 mg", "50 mg"], route: O, klass: "Beta blocker" },
  { name: "Atenolol", strengths: ["25 mg", "50 mg"], route: O, klass: "Beta blocker" },
  { name: "Nebivolol", strengths: ["5 mg"], route: O, klass: "Beta blocker" },
  { name: "Hydrochlorothiazide", strengths: ["12.5 mg", "25 mg"], route: O, klass: "Diuretic" },
  { name: "Furosemide", strengths: ["20 mg", "40 mg"], route: O, klass: "Diuretic" },
  { name: "Atorvastatin", strengths: ["10 mg", "20 mg", "40 mg"], route: O, klass: "Statin" },
  { name: "Rosuvastatin", strengths: ["5 mg", "10 mg", "20 mg"], route: O, klass: "Statin" },
  { name: "Clopidogrel", strengths: ["75 mg"], route: O, klass: "Antiplatelet" },

  // Endocrine — diabetes, thyroid
  { name: "Metformin", strengths: ["500 mg", "850 mg", "1 g"], route: O, klass: "Antidiabetic" },
  { name: "Glimepiride", strengths: ["1 mg", "2 mg"], route: O, klass: "Antidiabetic" },
  { name: "Gliclazide", strengths: ["40 mg", "80 mg"], route: O, klass: "Antidiabetic" },
  { name: "Sitagliptin", strengths: ["50 mg", "100 mg"], route: O, klass: "Antidiabetic" },
  { name: "Vildagliptin", strengths: ["50 mg"], route: O, klass: "Antidiabetic" },
  { name: "Dapagliflozin", strengths: ["10 mg"], route: O, klass: "Antidiabetic" },
  { name: "Empagliflozin", strengths: ["10 mg", "25 mg"], route: O, klass: "Antidiabetic" },
  { name: "Pioglitazone", strengths: ["15 mg", "30 mg"], route: O, klass: "Antidiabetic" },
  { name: "Levothyroxine", strengths: ["25 mcg", "50 mcg", "75 mcg", "100 mcg"], route: O, klass: "Thyroid" },

  // Respiratory
  { name: "Salbutamol", strengths: ["2 mg", "4 mg"], route: O, klass: "Bronchodilator" },
  { name: "Ambroxol", strengths: ["30 mg"], route: O, klass: "Mucolytic" },
  { name: "Bromhexine", strengths: ["8 mg"], route: O, klass: "Mucolytic" },
  { name: "Guaifenesin", strengths: ["100 mg/5 ml"], route: O, klass: "Expectorant" },
  { name: "Dextromethorphan", strengths: ["10 mg/5 ml"], route: O, klass: "Antitussive" },
  { name: "Theophylline", strengths: ["100 mg", "200 mg SR"], route: O, klass: "Bronchodilator" },

  // Steroids
  { name: "Prednisolone", strengths: ["5 mg", "10 mg"], route: O, klass: "Steroid" },
  { name: "Methylprednisolone", strengths: ["4 mg", "8 mg", "16 mg"], route: O, klass: "Steroid" },
  { name: "Deflazacort", strengths: ["6 mg", "30 mg"], route: O, klass: "Steroid" },
  { name: "Dexamethasone", strengths: ["0.5 mg"], route: O, klass: "Steroid" },

  // Antifungal / antiviral
  { name: "Fluconazole", strengths: ["150 mg", "200 mg"], route: O, klass: "Antifungal" },
  { name: "Itraconazole", strengths: ["100 mg", "200 mg"], route: O, klass: "Antifungal" },
  { name: "Terbinafine", strengths: ["250 mg"], route: O, klass: "Antifungal" },
  { name: "Acyclovir", strengths: ["400 mg", "800 mg"], route: O, klass: "Antiviral" },
  { name: "Oseltamivir", strengths: ["75 mg"], route: O, klass: "Antiviral" },

  // CNS / neuro / psych
  { name: "Amitriptyline", strengths: ["10 mg", "25 mg"], route: O, klass: "Antidepressant" },
  { name: "Sertraline", strengths: ["50 mg", "100 mg"], route: O, klass: "Antidepressant" },
  { name: "Escitalopram", strengths: ["5 mg", "10 mg"], route: O, klass: "Antidepressant" },
  { name: "Gabapentin", strengths: ["100 mg", "300 mg"], route: O, klass: "Neuropathic" },
  { name: "Pregabalin", strengths: ["75 mg", "150 mg"], route: O, klass: "Neuropathic" },
  { name: "Baclofen", strengths: ["10 mg"], route: O, klass: "Muscle relaxant" },
  { name: "Thiocolchicoside", strengths: ["4 mg"], route: O, klass: "Muscle relaxant" },

  // Vitamins / supplements
  { name: "Vitamin D3 (Cholecalciferol)", strengths: ["1000 IU", "60000 IU"], route: O, klass: "Supplement" },
  { name: "Vitamin B12 (Methylcobalamin)", strengths: ["500 mcg", "1500 mcg"], route: O, klass: "Supplement" },
  { name: "Vitamin C (Ascorbic acid)", strengths: ["500 mg"], route: O, klass: "Supplement" },
  { name: "Folic acid", strengths: ["5 mg"], route: O, klass: "Supplement" },
  { name: "Ferrous sulfate", strengths: ["200 mg"], route: O, klass: "Supplement" },
  { name: "Calcium + Vitamin D3", strengths: ["500 mg + 250 IU"], route: O, klass: "Supplement" },
  { name: "Zinc", strengths: ["20 mg", "50 mg"], route: O, klass: "Supplement" },
  { name: "Multivitamin", strengths: ["1 tablet"], route: O, klass: "Supplement" },
  { name: "ORS", strengths: ["1 sachet"], route: O, klass: "Rehydration" },
];

/**
 * Rank: exact prefix > word-start match > substring. Case-insensitive,
 * also matches the drug class so "antibiotic" surfaces the group.
 */
export function searchFormulary(query: string, limit = 8): FormularyEntry[] {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return [];
  const scored: Array<{ entry: FormularyEntry; score: number }> = [];
  for (const entry of FORMULARY) {
    const name = entry.name.toLowerCase();
    let score = -1;
    if (name.startsWith(q)) score = 0;
    else if (new RegExp(`\\b${escapeRegExp(q)}`).test(name)) score = 1;
    else if (name.includes(q)) score = 2;
    else if (entry.klass.toLowerCase().includes(q)) score = 3;
    if (score >= 0) scored.push({ entry, score });
  }
  scored.sort((a, b) => a.score - b.score || a.entry.name.localeCompare(b.entry.name));
  return scored.slice(0, limit).map((s) => s.entry);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
