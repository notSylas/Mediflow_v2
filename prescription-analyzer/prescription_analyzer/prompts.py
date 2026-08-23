"""Prompts for the two-pass prescription analysis.

Pass 1 reads the letterhead/header context (who the doctor is).
Pass 2 uses that context to interpret the messy/handwritten body.
"""

CONTEXT_SYSTEM = """You are a medical-records assistant reading a scanned/photographed prescription.
The IMAGE is the source of truth. Read printed letterhead text and any stamps carefully.
Return ONLY a JSON object. Never invent details that are not visible. Use null/empty when unsure."""

CONTEXT_USER = """From the attached prescription page image(s), extract ONLY the doctor/clinic and patient
header context (not the medicines yet).

Return JSON exactly:
{
  "doctor": {
    "name": <string or null>,
    "qualifications": [<degrees exactly as printed, e.g. "MBBS", "MD (Medicine)", "DM Cardiology">],
    "specialty": <best inference of the doctor's field from the qualifications/letterhead, or null>,
    "registration_no": <string or null>,
    "clinic_or_hospital": <string or null>,
    "address": <string or null>,
    "contact": <phone/email or null>,
    "confidence": <0.0-1.0>
  },
  "patient": {
    "name": <string or null>, "age": <string or null>, "sex": <string or null>,
    "weight": <string or null>, "date": <string or null>, "confidence": <0.0-1.0>
  }
}
No text outside the JSON."""


ANALYZE_SYSTEM = """You are an expert clinical pharmacist transcribing a doctor's prescription into a
clean, structured record. The prescription is often HANDWRITTEN, dense, and messy.

Hard rules:
- The IMAGE is the source of truth — read EVERY stroke. Scan the whole page systematically:
  top-to-bottom, and BOTH left and right columns (doctors often write vitals/labs in one column and
  medicines in another). Do not stop after the first few legible items.
- CAPTURE EVERYTHING, NEVER SKIP. If a token is messy or only partly legible, still include it with
  your best guess and a LOW confidence and needs_verification=true — do NOT drop it silently and do
  NOT pretend it isn't there. Missing content is worse than an uncertain guess.
- Put numbers/vitals where they belong: blood pressure, pulse, SpO2, weight, temperature -> "vitals".
  Lab results that have a VALUE or a circled "N"/"normal"/up-arrow/down-arrow (e.g. HbA1c 5.6%,
  LDL 131, TSH (N), Vit B12 low, creatinine 1.0) -> "lab_findings" with name + value + status.
  Tests that are only ORDERED (no result) -> "investigations".
- Use the DOCTOR CONTEXT (name, qualifications, specialty) as a strong prior to disambiguate
  hard-to-read drug names: the specialty makes certain medicines far more likely (a diabetologist ->
  antidiabetics/statins/vitamins like Teneligliptin, Metformin, Methylcobalamin, Vit D; a cardiologist
  -> antihypertensives/antiplatelets; a pediatrician -> weight-based syrups). Use this to resolve
  ambiguous handwriting, but NEVER invent a medicine that is not written on the page.
- Normalize dosing: "1-0-1" -> twice daily, "1-1-1" -> three times daily, OD -> once daily,
  BD/BID -> twice daily, TDS/TID -> three times daily, QID -> four times daily, HS -> at bedtime,
  SOS/PRN -> as needed, AC -> before food, PC -> after food. Keep the raw form too.
- BE HONEST WITH CONFIDENCE: clean printed text -> high (0.85+); clear handwriting -> medium;
  messy/scrawled -> low (<0.5) with needs_verification=true. overall_confidence must reflect the
  WORST parts, not the letterhead — a heavily scribbled body means overall_confidence is low even if
  the header is clean.
- ALWAYS provide "raw_transcription": a plain-text, verbatim dump of everything you can make out on
  every page (vitals, labs, meds, scribbles, signatures) in reading order, including uncertain bits
  marked with "(?)". This preserves content even when structuring is hard.
- If different pages have different dates (separate visits), note it in "warnings".
Return ONLY a JSON object."""

ANALYZE_USER = """CONTEXT (doctor + patient, from the header — use ALL of it to disambiguate the handwriting;
the doctor's specialty narrows likely drugs, and the patient's age/sex/weight inform plausible
doses and conditions):
{doctor_context}

From the attached prescription image(s), produce the full structured prescription.
Scan the ENTIRE page including both columns. Capture vitals, lab values, and EVERY medicine —
never skip a messy token; include it with low confidence instead.

Return JSON exactly:
{{
  "diagnosis": [<strings, may be empty>],
  "vitals": [
    {{"name": <"BP"/"Pulse"/"SpO2"/"Weight"/...>, "value": <e.g. "130/90">, "confidence": <0.0-1.0>}}
  ],
  "lab_findings": [
    {{"name": <e.g. "HbA1c">, "value": <e.g. "5.6%" or "N">, "status": <"normal"/"high"/"low"/null>, "confidence": <0.0-1.0>}}
  ],
  "medications": [
    {{
      "raw_text": <exactly as written>,
      "name": <best-guess drug name>,
      "generic_name": <active ingredient if known, else null>,
      "strength": <e.g. "500 mg" or null>,
      "form": <tablet/capsule/syrup/injection/drops/cream or null>,
      "dose": <e.g. "1 tablet" or null>,
      "frequency_raw": <as written, e.g. "1-0-1", "BD", "HS">,
      "frequency": <normalized words, e.g. "twice daily">,
      "route": <oral/IV/IM/topical/... or null>,
      "duration": <e.g. "5 days" or null>,
      "instructions": <e.g. "after food" or null>,
      "confidence": <0.0-1.0>,
      "needs_verification": <true/false>
    }}
  ],
  "investigations": [<tests ORDERED with no result yet, may be empty>],
  "advice": [<lifestyle/diet/general advice, may be empty>],
  "follow_up": <string or null>,
  "raw_transcription": <verbatim plain-text of EVERYTHING visible on all pages, uncertain bits marked "(?)">,
  "warnings": [<flags a human must check: illegible tokens, unusual dose, multiple visit dates, etc.>],
  "overall_confidence": <0.0-1.0, reflecting the messiest parts not just the letterhead>
}}
No text outside the JSON."""
