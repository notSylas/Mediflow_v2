# Prescription Analyzer

Turns a messy / handwritten doctor's prescription (PDF or image) into a **structured JSON**
record. Mirrors the question-paper pipeline's approach: render pages → vision LLM → structured
extraction, with a **two-pass** flow.

## How it works

1. **Render** — the PDF is converted to high-DPI page images (PyMuPDF, no system deps).
2. **Pass 1 — context** — a vision LLM reads the letterhead: doctor name, **qualifications**,
   **specialty**, registration no, clinic, plus patient header.
3. **Pass 2 — interpret** — the doctor context is fed back in so the model can **disambiguate
   hard-to-read drug names using the doctor's specialty** (a cardiologist's scrawl is read against
   cardiac drugs, a pediatrician's against weight-based syrups, etc.). Dosing shorthand
   (`1-0-1`, `BD`, `TDS`, `HS`, `SOS`, `AC/PC`) is normalized.
4. **Output** — a strict schema (see `prescription_analyzer/schema.py`) with **per-field
   confidence** and `needs_verification` flags, plus top-level `warnings` for anything a human
   should double-check.

## Setup

```bash
cd prescription_analyzer
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env        # then set OPENAI_API_KEY (or switch to Ollama)
```

## Run (CLI)

```bash
python main.py /path/to/prescription.pdf
python main.py /path/to/prescription.pdf --out result.json
```

## Run (web app)

A tiny React frontend (`web/index.html`, zero-build — React via CDN) talks to a FastAPI backend.

```bash
# 1. start the API (from the prescription_analyzer/ folder, venv active)
uvicorn api:app --reload --port 8000

# 2. open the frontend — either just open the file:
open web/index.html
#    or serve it (avoids any file:// quirks):
python -m http.server 5173 --directory web   # then visit http://localhost:5173
```

Upload a PDF/photo → see the structured doctor / patient / vitals / labs / medications, with
confidence pills, "VERIFY" flags, a warnings banner, and a collapsible raw transcription.
(The frontend calls `http://localhost:8000/analyze`; CORS is open for local use.)

## Provider options

- **OpenAI (default):** set `OPENAI_API_KEY`, `OPENAI_MODEL=gpt-4o`.
- **Ollama vision (qwen2.5vl):** set `LLM_PROVIDER=ollama`, `OLLAMA_HOST`, `OLLAMA_MODEL=qwen2.5vl:32b`
  (uses Ollama's OpenAI-compatible `/v1` endpoint).

## ⚠️ Safety

This is a **decision-support / transcription aid**, not a prescriber. Handwriting reading is
imperfect — always have a pharmacist/doctor verify, especially any item with low `confidence` or
`needs_verification: true`. For production, validate extracted drug names/doses against an
authoritative drug database and check interactions before relying on the output.

## Extending toward production

- Add a **drug-database validation** step (fuzzy/semantic match of `name` against a real medicines
  list) — the analog of the question-paper RAG/reference-answer matching.
- Add **interaction / dose-range checks** as a post-pass that appends to `warnings`.
