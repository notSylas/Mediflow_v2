"""Structured output schema for an analyzed prescription.

Everything optional/defaulted so a messy scan never hard-fails parsing.
Each interpreted field carries a confidence so downstream code (and a human
reviewer) knows what to double-check — critical for a medical document.
"""

from typing import List, Optional
from pydantic import BaseModel, Field


class DoctorContext(BaseModel):
    name: Optional[str] = None
    qualifications: List[str] = Field(default_factory=list)   # e.g. ["MBBS", "MD (Cardiology)"]
    specialty: Optional[str] = None                           # inferred from qualifications/letterhead
    registration_no: Optional[str] = None
    clinic_or_hospital: Optional[str] = None
    address: Optional[str] = None
    contact: Optional[str] = None
    confidence: float = 0.0


class PatientInfo(BaseModel):
    name: Optional[str] = None
    age: Optional[str] = None
    sex: Optional[str] = None
    weight: Optional[str] = None
    date: Optional[str] = None
    confidence: float = 0.0


class Medication(BaseModel):
    raw_text: Optional[str] = None          # exactly as written/read on the prescription
    name: Optional[str] = None              # best-guess drug name (brand or generic)
    generic_name: Optional[str] = None      # active ingredient if identifiable
    strength: Optional[str] = None          # e.g. "500 mg", "5 mg/5 ml"
    form: Optional[str] = None              # tablet, capsule, syrup, injection, drops...
    dose: Optional[str] = None              # e.g. "1 tablet", "10 ml"
    frequency_raw: Optional[str] = None     # as written: "1-0-1", "BD", "TDS", "HS", "SOS"
    frequency: Optional[str] = None         # normalized: "twice daily", "at bedtime", "as needed"
    route: Optional[str] = None             # oral, IV, IM, topical, etc.
    duration: Optional[str] = None          # e.g. "5 days", "2 weeks"
    instructions: Optional[str] = None      # "after food", "before sleep", etc.
    confidence: float = 0.0                 # 0-1; low => flag for human verification
    needs_verification: bool = False        # true when the read is uncertain


class VitalSign(BaseModel):
    name: Optional[str] = None       # e.g. "BP", "Pulse", "SpO2", "Weight"
    value: Optional[str] = None      # e.g. "130/90", "93/min", "98%"
    confidence: float = 0.0


class LabFinding(BaseModel):
    name: Optional[str] = None       # e.g. "HbA1c", "LDL", "TSH", "Vitamin B12", "Creatinine"
    value: Optional[str] = None      # e.g. "5.6%", "131", "N" (normal), "low"
    status: Optional[str] = None     # "normal" / "high" / "low" / null  (e.g. circled "N" = normal)
    confidence: float = 0.0


class AnalyzedPrescription(BaseModel):
    doctor: DoctorContext = Field(default_factory=DoctorContext)
    patient: PatientInfo = Field(default_factory=PatientInfo)
    diagnosis: List[str] = Field(default_factory=list)
    vitals: List[VitalSign] = Field(default_factory=list)            # BP, pulse, SpO2, weight...
    lab_findings: List[LabFinding] = Field(default_factory=list)     # labs WITH values/status
    medications: List[Medication] = Field(default_factory=list)
    investigations: List[str] = Field(default_factory=list)          # tests ORDERED (no value yet)
    advice: List[str] = Field(default_factory=list)                  # lifestyle/diet/general advice
    follow_up: Optional[str] = None
    raw_transcription: Optional[str] = None                          # verbatim dump of EVERYTHING seen
    warnings: List[str] = Field(default_factory=list)                # analyzer-level flags for a human
    overall_confidence: float = 0.0
    pages_analyzed: int = 0
