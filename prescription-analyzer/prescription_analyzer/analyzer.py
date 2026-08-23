"""Two-pass prescription analysis orchestration.

Pass 1: read doctor/patient header context.
Pass 2: feed that context back in to interpret the messy/handwritten body.
"""

import json
import logging

from config import Config
from .pdf_utils import pdf_to_page_images
from .llm import VisionLLM
from .prompts import (
    CONTEXT_SYSTEM,
    CONTEXT_USER,
    ANALYZE_SYSTEM,
    ANALYZE_USER,
    SWEEP_SYSTEM,
    SWEEP_USER,
)
from .schema import (
    AnalyzedPrescription, DoctorContext, PatientInfo, Medication,
    VitalSign, LabFinding,
)

logger = logging.getLogger(__name__)


class PrescriptionAnalyzer:
    def __init__(self):
        self.llm = VisionLLM()

    def analyze(self, pdf_path: str) -> AnalyzedPrescription:
        images = pdf_to_page_images(pdf_path, dpi=Config.RENDER_DPI)
        logger.info("Rendered %d page(s) from %s", len(images), pdf_path)
        if not images:
            return AnalyzedPrescription(warnings=["No pages could be rendered from the file."])

        # --- Pass 1: who is the doctor? (context) ---
        try:
            ctx = self.llm.complete_json(CONTEXT_SYSTEM, CONTEXT_USER, images, max_tokens=2000)
        except Exception as e:
            logger.warning("Context pass failed: %s", e)
            ctx = {}

        doctor = DoctorContext(**(ctx.get("doctor") or {}))
        patient = PatientInfo(**(ctx.get("patient") or {}))
        logger.info("Doctor: %s | specialty: %s", doctor.name, doctor.specialty)

        # --- Pass 2: interpret the body using ALL the context from pass 1 ---
        context_str = json.dumps(
            {
                "doctor": {
                    "name": doctor.name,
                    "qualifications": doctor.qualifications,
                    "specialty": doctor.specialty,
                    "clinic_or_hospital": doctor.clinic_or_hospital,
                },
                "patient": {
                    "name": patient.name,
                    "age": patient.age,
                    "sex": patient.sex,
                    "weight": patient.weight,
                    "date": patient.date,
                },
            },
            ensure_ascii=False,
        )
        user = ANALYZE_USER.format(doctor_context=context_str)
        try:
            body = self.llm.complete_json(ANALYZE_SYSTEM, user, images, max_tokens=16000)
        except Exception as e:
            logger.error("Analysis pass failed: %s", e)
            return AnalyzedPrescription(
                doctor=doctor, patient=patient, pages_analyzed=len(images),
                warnings=[f"Analysis pass failed: {e}"],
            )

        meds = [Medication(**m) for m in (body.get("medications") or []) if isinstance(m, dict)]
        vitals = [VitalSign(**v) for v in (body.get("vitals") or []) if isinstance(v, dict)]
        labs = [LabFinding(**l) for l in (body.get("lab_findings") or []) if isinstance(l, dict)]

        result = AnalyzedPrescription(
            doctor=doctor,
            patient=patient,
            diagnosis=body.get("diagnosis") or [],
            vitals=vitals,
            lab_findings=labs,
            medications=meds,
            investigations=body.get("investigations") or [],
            advice=body.get("advice") or [],
            follow_up=body.get("follow_up"),
            raw_transcription=body.get("raw_transcription"),
            warnings=body.get("warnings") or [],
            overall_confidence=float(body.get("overall_confidence") or 0.0),
            pages_analyzed=len(images),
        )

        # --- Pass 3: completeness sweep -------------------------------------
        # Ask specifically what was MISSED. One extraction pass reads the easy
        # layer well and quietly drops handwriting layered on printed text; a
        # narrower "what is absent from this JSON?" question catches it without
        # re-reading the whole page.
        self._sweep(result, images)

        # Safety net: surface any low-confidence / flagged medication to the top-level warnings.
        for m in result.medications:
            if m.needs_verification or m.confidence < 0.5:
                result.warnings.append(
                    f"Verify medication: '{m.raw_text or m.name}' (confidence {m.confidence:.2f})"
                )
        return result

    def _sweep(self, result: AnalyzedPrescription, images) -> None:
        """Merge anything the audit pass found that the main pass missed.

        Failures here are non-fatal on purpose: a completed extraction is worth
        more than no result, so a sweep that errors just leaves a warning.
        """
        try:
            extracted = result.model_dump_json(
                indent=None,
                exclude={"raw_transcription", "warnings", "overall_confidence", "pages_analyzed"},
            )
            found = self.llm.complete_json(
                SWEEP_SYSTEM, SWEEP_USER.format(extracted=extracted), images, max_tokens=6000
            )
        except Exception as e:
            logger.warning("Completeness sweep failed: %s", e)
            result.warnings.append(
                "Second-look pass could not run — some handwritten items may be missing."
            )
            return

        added: list[str] = []

        def _extend(field: str, model, seen_key):
            existing = {seen_key(x) for x in getattr(result, field)}
            for raw in found.get(field) or []:
                if not isinstance(raw, dict):
                    continue
                try:
                    item = model(**raw)
                except Exception:
                    continue
                key = seen_key(item)
                if not key or key in existing:
                    continue
                # Anything only the audit pass saw is by definition less certain.
                if hasattr(item, "needs_verification"):
                    item.needs_verification = True
                existing.add(key)
                getattr(result, field).append(item)
                added.append(f"{field}: {key}")

        _extend("medications", Medication, lambda m: (m.name or m.raw_text or "").strip().lower())
        _extend("vitals", VitalSign, lambda v: (v.name or "").strip().lower())
        _extend("lab_findings", LabFinding, lambda l: (l.name or "").strip().lower())

        for field in ("investigations", "advice", "diagnosis"):
            existing = {str(x).strip().lower() for x in getattr(result, field)}
            for raw in found.get(field) or []:
                text = str(raw).strip()
                if text and text.lower() not in existing:
                    existing.add(text.lower())
                    getattr(result, field).append(text)
                    added.append(f"{field}: {text}")

        for note in found.get("notes") or []:
            result.warnings.append(str(note))

        missed_text = [str(t).strip() for t in (found.get("missed_text") or []) if str(t).strip()]
        if missed_text:
            result.raw_transcription = (
                (result.raw_transcription or "")
                + "\n\n--- second-look pass also read ---\n"
                + "\n".join(missed_text)
            )

        if added:
            logger.info("Sweep recovered %d item(s): %s", len(added), "; ".join(added[:8]))
            result.warnings.append(
                f"A second-look pass found {len(added)} item(s) the first pass missed — "
                "these are marked for verification."
            )
