"""CLI: analyze a prescription PDF/image into a structured JSON record.

Usage:
    python main.py path/to/prescription.pdf
    python main.py path/to/prescription.pdf --out result.json
"""

import argparse
import json
import logging
import sys

from prescription_analyzer.analyzer import PrescriptionAnalyzer


def main():
    logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")

    parser = argparse.ArgumentParser(description="Analyze a (possibly handwritten) prescription.")
    parser.add_argument("path", help="Path to the prescription PDF or image")
    parser.add_argument("--out", help="Write structured JSON to this file", default=None)
    args = parser.parse_args()

    analyzer = PrescriptionAnalyzer()
    result = analyzer.analyze(args.path)

    payload = result.model_dump()
    text = json.dumps(payload, indent=2, ensure_ascii=False)

    if args.out:
        with open(args.out, "w", encoding="utf-8") as f:
            f.write(text)
        print(f"Wrote structured result -> {args.out}")
    else:
        print(text)

    # Non-zero exit if nothing useful was extracted, so it composes in scripts.
    if not result.medications and not result.diagnosis:
        print("\n[!] No medications or diagnosis extracted — check the image quality.", file=sys.stderr)


if __name__ == "__main__":
    main()
