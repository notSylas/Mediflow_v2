/**
 * Baseline medicine formulary used to seed the `medicines` table. After
 * seeding, the list is maintained in the database (Drizzle Studio / re-seed),
 * not here. The mobile app ships a copy of this list as an offline fallback.
 */
export interface SeedMedicine {
  name: string;
  strengths: string[];
  route: string;
  category: string;
}

const O = "oral";

export const MEDICINE_SEED: SeedMedicine[] = [
  // Analgesics / antipyretics / NSAIDs
  { name: "Paracetamol", strengths: ["500 mg", "650 mg", "1 g"], route: O, category: "Analgesic" },
  { name: "Ibuprofen", strengths: ["200 mg", "400 mg", "600 mg"], route: O, category: "NSAID" },
  { name: "Diclofenac", strengths: ["50 mg", "75 mg SR"], route: O, category: "NSAID" },
  { name: "Aceclofenac", strengths: ["100 mg", "200 mg SR"], route: O, category: "NSAID" },
  { name: "Naproxen", strengths: ["250 mg", "500 mg"], route: O, category: "NSAID" },
  { name: "Aspirin", strengths: ["75 mg", "150 mg", "325 mg"], route: O, category: "NSAID" },
  { name: "Mefenamic acid", strengths: ["250 mg", "500 mg"], route: O, category: "NSAID" },
  { name: "Tramadol", strengths: ["50 mg", "100 mg"], route: O, category: "Analgesic" },
  { name: "Ketorolac", strengths: ["10 mg"], route: O, category: "NSAID" },
  { name: "Etoricoxib", strengths: ["60 mg", "90 mg", "120 mg"], route: O, category: "NSAID" },

  // Antibiotics
  { name: "Amoxicillin", strengths: ["250 mg", "500 mg"], route: O, category: "Antibiotic" },
  { name: "Amoxicillin + Clavulanate", strengths: ["375 mg", "625 mg"], route: O, category: "Antibiotic" },
  { name: "Azithromycin", strengths: ["250 mg", "500 mg"], route: O, category: "Antibiotic" },
  { name: "Cephalexin", strengths: ["250 mg", "500 mg"], route: O, category: "Antibiotic" },
  { name: "Cefixime", strengths: ["100 mg", "200 mg"], route: O, category: "Antibiotic" },
  { name: "Cefpodoxime", strengths: ["100 mg", "200 mg"], route: O, category: "Antibiotic" },
  { name: "Ciprofloxacin", strengths: ["250 mg", "500 mg"], route: O, category: "Antibiotic" },
  { name: "Levofloxacin", strengths: ["250 mg", "500 mg"], route: O, category: "Antibiotic" },
  { name: "Ofloxacin", strengths: ["200 mg"], route: O, category: "Antibiotic" },
  { name: "Norfloxacin", strengths: ["400 mg"], route: O, category: "Antibiotic" },
  { name: "Doxycycline", strengths: ["100 mg"], route: O, category: "Antibiotic" },
  { name: "Metronidazole", strengths: ["200 mg", "400 mg"], route: O, category: "Antibiotic" },
  { name: "Clarithromycin", strengths: ["250 mg", "500 mg"], route: O, category: "Antibiotic" },
  { name: "Nitrofurantoin", strengths: ["100 mg"], route: O, category: "Antibiotic" },
  { name: "Cotrimoxazole", strengths: ["480 mg", "960 mg"], route: O, category: "Antibiotic" },
  { name: "Faropenem", strengths: ["200 mg"], route: O, category: "Antibiotic" },

  // Antihistamines / anti-allergy
  { name: "Cetirizine", strengths: ["5 mg", "10 mg"], route: O, category: "Antihistamine" },
  { name: "Levocetirizine", strengths: ["5 mg"], route: O, category: "Antihistamine" },
  { name: "Loratadine", strengths: ["10 mg"], route: O, category: "Antihistamine" },
  { name: "Fexofenadine", strengths: ["120 mg", "180 mg"], route: O, category: "Antihistamine" },
  { name: "Chlorpheniramine", strengths: ["4 mg"], route: O, category: "Antihistamine" },
  { name: "Hydroxyzine", strengths: ["10 mg", "25 mg"], route: O, category: "Antihistamine" },
  { name: "Montelukast", strengths: ["4 mg", "5 mg", "10 mg"], route: O, category: "Anti-asthmatic" },

  // GI — PPIs, antacids, antiemetics, antispasmodics
  { name: "Omeprazole", strengths: ["20 mg", "40 mg"], route: O, category: "PPI" },
  { name: "Pantoprazole", strengths: ["20 mg", "40 mg"], route: O, category: "PPI" },
  { name: "Esomeprazole", strengths: ["20 mg", "40 mg"], route: O, category: "PPI" },
  { name: "Rabeprazole", strengths: ["10 mg", "20 mg"], route: O, category: "PPI" },
  { name: "Ranitidine", strengths: ["150 mg", "300 mg"], route: O, category: "H2 blocker" },
  { name: "Famotidine", strengths: ["20 mg", "40 mg"], route: O, category: "H2 blocker" },
  { name: "Domperidone", strengths: ["10 mg"], route: O, category: "Antiemetic" },
  { name: "Ondansetron", strengths: ["4 mg", "8 mg"], route: O, category: "Antiemetic" },
  { name: "Sucralfate", strengths: ["1 g"], route: O, category: "Antacid" },
  { name: "Dicyclomine", strengths: ["10 mg", "20 mg"], route: O, category: "Antispasmodic" },
  { name: "Drotaverine", strengths: ["40 mg", "80 mg"], route: O, category: "Antispasmodic" },
  { name: "Loperamide", strengths: ["2 mg"], route: O, category: "Antidiarrhoeal" },
  { name: "Lactulose", strengths: ["10 g/15 ml"], route: O, category: "Laxative" },
  { name: "Bisacodyl", strengths: ["5 mg"], route: O, category: "Laxative" },
  { name: "Ursodeoxycholic acid", strengths: ["150 mg", "300 mg"], route: O, category: "Hepatic" },

  // Cardiovascular / antihypertensives
  { name: "Amlodipine", strengths: ["2.5 mg", "5 mg", "10 mg"], route: O, category: "Antihypertensive" },
  { name: "Telmisartan", strengths: ["20 mg", "40 mg", "80 mg"], route: O, category: "Antihypertensive" },
  { name: "Losartan", strengths: ["25 mg", "50 mg"], route: O, category: "Antihypertensive" },
  { name: "Olmesartan", strengths: ["20 mg", "40 mg"], route: O, category: "Antihypertensive" },
  { name: "Ramipril", strengths: ["2.5 mg", "5 mg"], route: O, category: "Antihypertensive" },
  { name: "Enalapril", strengths: ["5 mg", "10 mg"], route: O, category: "Antihypertensive" },
  { name: "Metoprolol", strengths: ["25 mg", "50 mg"], route: O, category: "Beta blocker" },
  { name: "Atenolol", strengths: ["25 mg", "50 mg"], route: O, category: "Beta blocker" },
  { name: "Nebivolol", strengths: ["5 mg"], route: O, category: "Beta blocker" },
  { name: "Hydrochlorothiazide", strengths: ["12.5 mg", "25 mg"], route: O, category: "Diuretic" },
  { name: "Furosemide", strengths: ["20 mg", "40 mg"], route: O, category: "Diuretic" },
  { name: "Atorvastatin", strengths: ["10 mg", "20 mg", "40 mg"], route: O, category: "Statin" },
  { name: "Rosuvastatin", strengths: ["5 mg", "10 mg", "20 mg"], route: O, category: "Statin" },
  { name: "Clopidogrel", strengths: ["75 mg"], route: O, category: "Antiplatelet" },

  // Endocrine — diabetes, thyroid
  { name: "Metformin", strengths: ["500 mg", "850 mg", "1 g"], route: O, category: "Antidiabetic" },
  { name: "Glimepiride", strengths: ["1 mg", "2 mg"], route: O, category: "Antidiabetic" },
  { name: "Gliclazide", strengths: ["40 mg", "80 mg"], route: O, category: "Antidiabetic" },
  { name: "Sitagliptin", strengths: ["50 mg", "100 mg"], route: O, category: "Antidiabetic" },
  { name: "Vildagliptin", strengths: ["50 mg"], route: O, category: "Antidiabetic" },
  { name: "Dapagliflozin", strengths: ["10 mg"], route: O, category: "Antidiabetic" },
  { name: "Empagliflozin", strengths: ["10 mg", "25 mg"], route: O, category: "Antidiabetic" },
  { name: "Pioglitazone", strengths: ["15 mg", "30 mg"], route: O, category: "Antidiabetic" },
  { name: "Levothyroxine", strengths: ["25 mcg", "50 mcg", "75 mcg", "100 mcg"], route: O, category: "Thyroid" },

  // Respiratory
  { name: "Salbutamol", strengths: ["2 mg", "4 mg"], route: O, category: "Bronchodilator" },
  { name: "Ambroxol", strengths: ["30 mg"], route: O, category: "Mucolytic" },
  { name: "Bromhexine", strengths: ["8 mg"], route: O, category: "Mucolytic" },
  { name: "Guaifenesin", strengths: ["100 mg/5 ml"], route: O, category: "Expectorant" },
  { name: "Dextromethorphan", strengths: ["10 mg/5 ml"], route: O, category: "Antitussive" },
  { name: "Theophylline", strengths: ["100 mg", "200 mg SR"], route: O, category: "Bronchodilator" },

  // Steroids
  { name: "Prednisolone", strengths: ["5 mg", "10 mg"], route: O, category: "Steroid" },
  { name: "Methylprednisolone", strengths: ["4 mg", "8 mg", "16 mg"], route: O, category: "Steroid" },
  { name: "Deflazacort", strengths: ["6 mg", "30 mg"], route: O, category: "Steroid" },
  { name: "Dexamethasone", strengths: ["0.5 mg"], route: O, category: "Steroid" },

  // Antifungal / antiviral
  { name: "Fluconazole", strengths: ["150 mg", "200 mg"], route: O, category: "Antifungal" },
  { name: "Itraconazole", strengths: ["100 mg", "200 mg"], route: O, category: "Antifungal" },
  { name: "Terbinafine", strengths: ["250 mg"], route: O, category: "Antifungal" },
  { name: "Acyclovir", strengths: ["400 mg", "800 mg"], route: O, category: "Antiviral" },
  { name: "Oseltamivir", strengths: ["75 mg"], route: O, category: "Antiviral" },

  // CNS / neuro / psych
  { name: "Amitriptyline", strengths: ["10 mg", "25 mg"], route: O, category: "Antidepressant" },
  { name: "Sertraline", strengths: ["50 mg", "100 mg"], route: O, category: "Antidepressant" },
  { name: "Escitalopram", strengths: ["5 mg", "10 mg"], route: O, category: "Antidepressant" },
  { name: "Gabapentin", strengths: ["100 mg", "300 mg"], route: O, category: "Neuropathic" },
  { name: "Pregabalin", strengths: ["75 mg", "150 mg"], route: O, category: "Neuropathic" },
  { name: "Baclofen", strengths: ["10 mg"], route: O, category: "Muscle relaxant" },
  { name: "Thiocolchicoside", strengths: ["4 mg"], route: O, category: "Muscle relaxant" },

  // Vitamins / supplements
  { name: "Vitamin D3 (Cholecalciferol)", strengths: ["1000 IU", "60000 IU"], route: O, category: "Supplement" },
  { name: "Vitamin B12 (Methylcobalamin)", strengths: ["500 mcg", "1500 mcg"], route: O, category: "Supplement" },
  { name: "Vitamin C (Ascorbic acid)", strengths: ["500 mg"], route: O, category: "Supplement" },
  { name: "Folic acid", strengths: ["5 mg"], route: O, category: "Supplement" },
  { name: "Ferrous sulfate", strengths: ["200 mg"], route: O, category: "Supplement" },
  { name: "Calcium + Vitamin D3", strengths: ["500 mg + 250 IU"], route: O, category: "Supplement" },
  { name: "Zinc", strengths: ["20 mg", "50 mg"], route: O, category: "Supplement" },
  { name: "Multivitamin", strengths: ["1 tablet"], route: O, category: "Supplement" },
  { name: "ORS", strengths: ["1 sachet"], route: O, category: "Rehydration" },
];
