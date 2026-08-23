"""Thin vision-LLM wrapper supporting OpenAI and Ollama (qwen2.5vl) via one interface."""

import json
import urllib.request
from typing import List

from openai import OpenAI

from config import Config


class VisionLLM:
    def __init__(self):
        self.provider = Config.LLM_PROVIDER
        self.model = Config.model()
        if self.provider == "ollama":
            self.ollama_host = Config.OLLAMA_HOST.rstrip("/")
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
        if self.provider == "ollama":
            return self._complete_json_ollama(system, user_text, image_data_uris, max_tokens)
        return self._complete_json_openai(system, user_text, image_data_uris, max_tokens)

    def _complete_json_openai(
        self, system: str, user_text: str, image_data_uris: List[str], max_tokens: int
    ) -> dict:
        content = [{"type": "text", "text": user_text}]
        for uri in image_data_uris:
            content.append({"type": "image_url", "image_url": {"url": uri, "detail": "high"}})

        resp = self.client.chat.completions.create(
            model=self.model,
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": content},
            ],
            temperature=0,
            max_tokens=max_tokens,
            frequency_penalty=0.4,
            presence_penalty=0.4,
            response_format={"type": "json_object"},
        )
        choice = resp.choices[0]
        if choice.finish_reason == "length":
            raise ValueError(
                f"model output hit the {max_tokens}-token limit and was truncated "
                "before the JSON closed — raise max_tokens for this pass"
            )
        raw = (choice.message.content or "").strip()
        return _parse_json(raw)

    def _complete_json_ollama(
        self, system: str, user_text: str, image_data_uris: List[str], max_tokens: int
    ) -> dict:
        # Deliberately NOT using the OpenAI SDK / Ollama's /v1 compat endpoint
        # here. Verified directly against this Ollama instance: the compat
        # endpoint silently ignores num_ctx (both the top-level field and the
        # nested {"options": {...}} shape) and always (re)loads the model at
        # the stock 4096-token context, even when a larger context was
        # already warm from a prior native-API call — confirmed via
        # GET /api/ps before/after each variant. Only the native /api/chat
        # endpoint with a top-level "options" object actually resizes the
        # loaded context. A single rendered page image can itself use over
        # 1k tokens, so without this the model runs out of context mid
        # response well before max_tokens is ever reached, and Ollama's
        # compat layer reports that as an opaque 400 "exceeds context size"
        # rather than a clean truncation signal.
        images_b64 = [uri.split(",", 1)[1] if "," in uri else uri for uri in image_data_uris]

        body = {
            "model": self.model,
            "messages": [
                {"role": "system", "content": system},
                {"role": "user", "content": user_text, "images": images_b64},
            ],
            "format": "json",
            "stream": False,
            "options": {
                "temperature": 0,
                "num_predict": max_tokens,
                "num_ctx": max_tokens + 8000,
                # Native equivalent of the frequency/presence penalty guard
                # against greedy-decoding repetition loops on the open-ended
                # "transcribe everything" instruction.
                "repeat_penalty": 1.3,
            },
        }
        req = urllib.request.Request(
            f"{self.ollama_host}/api/chat",
            data=json.dumps(body).encode("utf-8"),
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        # Generous timeout: a dense multi-page prescription on a local GPU
        # can genuinely take a couple of minutes at a large context size.
        with urllib.request.urlopen(req, timeout=300) as resp:
            data = json.loads(resp.read().decode("utf-8"))

        if data.get("done_reason") == "length":
            raise ValueError(
                f"model output hit the {max_tokens}-token limit and was truncated "
                "before the JSON closed — raise max_tokens for this pass"
            )

        raw = (data.get("message", {}).get("content") or "").strip()
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
