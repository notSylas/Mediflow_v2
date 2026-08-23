"""Verifies the Ollama vision setup for the Prescription Analyzer end to end.

Checks connectivity + that the configured model is actually pulled on the
Ollama host, then runs a synthesized test prescription through the real
two-pass pipeline (prescription_analyzer/analyzer.py) — the same code path
production uses. Standalone: doesn't touch the app/DB integration.

Run (from this directory, with .env at the repo root set to LLM_PROVIDER=ollama):
    python test_ollama_connection.py
"""

import json
import logging
import os
import sys
import tempfile
from urllib.error import URLError
from urllib.request import urlopen

import fitz  # PyMuPDF

from config import Config
from prescription_analyzer.analyzer import PrescriptionAnalyzer

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger("test-ollama-connection")


def check_connectivity() -> None:
    print(f"Provider: {Config.LLM_PROVIDER}")
    print(f"Host:     {Config.OLLAMA_HOST}")
    print(f"Model:    {Config.model()}")

    if Config.LLM_PROVIDER != "ollama":
        print("\n[FAIL] LLM_PROVIDER is not 'ollama' — set it in .env before running this.")
        sys.exit(1)

    url = Config.OLLAMA_HOST.rstrip("/") + "/api/tags"
    try:
        with urlopen(url, timeout=5) as resp:
            tags = json.loads(resp.read())
    except URLError as e:
        print(f"\n[FAIL] Could not reach {url}: {e}")
        sys.exit(1)

    names = {m.get("name") for m in tags.get("models", [])}
    if Config.OLLAMA_MODEL not in names:
        print(f"\n[FAIL] '{Config.OLLAMA_MODEL}' is not pulled on {Config.OLLAMA_HOST}.")
        print(f"       Available: {', '.join(sorted(n for n in names if n)) or '(none)'}")
        sys.exit(1)

    print(f"[OK] {url} reachable, '{Config.OLLAMA_MODEL}' is available.\n")


def make_test_prescription() -> str:
    """Synthesizes a one-page fake prescription PDF so this test needs no sample file."""
    doc = fitz.open()
    page = doc.new_page()
    lines = [
        (72, 72, "Dr. Asha Rao, MBBS MD", 14),
        (72, 92, "Rao Family Clinic, Koramangala, Bengaluru", 10),
        (72, 130, "Patient: Test Patient   Age: 34   Sex: F", 11),
        (72, 150, "Date: 2026-08-23", 11),
        (72, 190, "Diagnosis: Viral fever", 12),
        (72, 220, "Rx:", 12),
        (90, 245, "Tab. Paracetamol 500mg  1-0-1 x 5 days, after food", 12),
        (90, 270, "Tab. Cetirizine 10mg  0-0-1 x 3 days", 12),
        (72, 310, "Advice: Rest, plenty of fluids. Follow up if fever persists.", 11),
    ]
    for x, y, text, size in lines:
        page.insert_text((x, y), text, fontsize=size)

    fd, path = tempfile.mkstemp(suffix=".pdf")
    os.close(fd)
    doc.save(path)
    doc.close()
    return path


def main() -> None:
    check_connectivity()

    pdf_path = make_test_prescription()
    print(f"Synthesized test prescription -> {pdf_path}\n")

    try:
        result = PrescriptionAnalyzer().analyze(pdf_path)
    finally:
        os.unlink(pdf_path)

    payload = result.model_dump()
    print(json.dumps(payload, indent=2, ensure_ascii=False))

    med_names = [m["name"] or m["raw_text"] for m in payload["medications"]]
    print(f"\nDoctor read:        {payload['doctor']['name']}")
    print(f"Medications found:  {med_names}")
    print(f"Overall confidence: {payload['overall_confidence']:.2f}")
    if payload["warnings"]:
        print(f"Warnings: {payload['warnings']}")

    if med_names and any("paracetamol" in (n or "").lower() for n in med_names):
        print("\n[PASS] Ollama + gemma3 read the test prescription correctly.")
    else:
        print(f"\n[FAIL] Expected 'Paracetamol' in the extracted medications — got: {med_names}")
        sys.exit(1)


if __name__ == "__main__":
    main()
