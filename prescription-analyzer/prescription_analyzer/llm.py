"""Thin vision-LLM wrapper supporting OpenAI and Ollama (qwen2.5vl) via one interface."""

import json
from typing import List, Optional

from openai import OpenAI

from config import Config


class VisionLLM:
    def __init__(self):
        self.provider = Config.LLM_PROVIDER
        self.model = Config.model()
        if self.provider == "ollama":
            # Ollama exposes an OpenAI-compatible endpoint at /v1
            base = Config.OLLAMA_HOST.rstrip("/") + "/v1"
            self.client = OpenAI(base_url=base, api_key="ollama")
        else:
            self.client = OpenAI(api_key=Config.OPENAI_API_KEY)

    def complete_json(
        self,
        system: str,
        user_text: str,
        image_data_uris: List[str],
        max_tokens: int = 8000,
    ) -> dict:
        """Send text + page images, return the parsed JSON object."""
        content = [{"type": "text", "text": user_text}]
        for uri in image_data_uris:
            content.append({"type": "image_url", "image_url": {"url": uri, "detail": "high"}})

        kwargs = dict(
            model=self.model,
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": content},
            ],
            temperature=0,
            max_tokens=max_tokens,
        )
        # OpenAI supports strict JSON mode; Ollama's compat layer may not.
        if self.provider == "openai":
            kwargs["response_format"] = {"type": "json_object"}

        resp = self.client.chat.completions.create(**kwargs)
        choice = resp.choices[0]

        # A truncated response is still *valid* as far as the API is concerned:
        # it just stops mid-object, and json.loads then reports a misleading
        # "Expecting ',' delimiter" deep in the string. Catch it at the source
        # so the failure names the real cause.
        if choice.finish_reason == "length":
            raise ValueError(
                f"model output hit the {max_tokens}-token limit and was truncated "
                "before the JSON closed — raise max_tokens for this pass"
            )

        raw = (choice.message.content or "").strip()
        return _parse_json(raw)


def _parse_json(raw: str) -> dict:
    if raw.startswith("```"):
        raw = raw.split("\n", 1)[-1].rsplit("```", 1)[0].strip()
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        # last resort: grab the outermost {...}
        start, end = raw.find("{"), raw.rfind("}")
        if start != -1 and end != -1:
            return json.loads(raw[start:end + 1])
        raise
