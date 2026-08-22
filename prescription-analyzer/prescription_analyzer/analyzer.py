"""Two-pass prescription analysis orchestration.

Pass 1: read doctor/patient header context.
Pass 2: feed that context back in to interpret the messy/handwritten body.
"""

import json
import logging

from config import Config
from .pdf_utils import pdf_to_page_images
from .llm import VisionLLM
from .prompts import CONTEXT_SYSTEM, CONTEXT_USER, ANALYZE_SYSTEM, ANALYZE_USER
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
            ctx = self.llm.complete_json(CONTEXT_SYSTEM, CONTEXT_USER, images, max_tokens=1200)
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
            body = self.llm.complete_json(ANALYZE_SYSTEM, user, images, max_tokens=3500)
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

        # Safety net: surface any low-confidence / flagged medication to the top-level warnings.
        for m in result.medications:
            if m.needs_verification or m.confidence < 0.5:
                result.warnings.append(
                    f"Verify medication: '{m.raw_text or m.name}' (confidence {m.confidence:.2f})"
                )
        return result
