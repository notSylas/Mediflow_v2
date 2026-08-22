"""Configuration for the prescription analyzer (env-driven, mirrors the QP service style)."""

import os

try:
    from dotenv import load_dotenv
    load_dotenv()
except Exception:
    pass


class Config:
    LLM_PROVIDER = os.environ.get("LLM_PROVIDER", "openai").lower()

    OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY", "")
    OPENAI_MODEL = os.environ.get("OPENAI_MODEL", "gpt-4o")

    OLLAMA_HOST = os.environ.get("OLLAMA_HOST", "http://10.60.61.147:11434")
    OLLAMA_MODEL = os.environ.get("OLLAMA_MODEL", "qwen2.5vl:32b")

    RENDER_DPI = int(os.environ.get("RENDER_DPI", "300"))

    @classmethod
    def model(cls) -> str:
        return cls.OLLAMA_MODEL if cls.LLM_PROVIDER == "ollama" else cls.OPENAI_MODEL
