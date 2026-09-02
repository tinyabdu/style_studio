import asyncio
import json
import re

from langchain_google_genai import ChatGoogleGenerativeAI

from config import settings

_model: ChatGoogleGenerativeAI | None = None


def get_llm() -> ChatGoogleGenerativeAI:
    """Lazily construct the shared Gemini client used by every LangGraph node."""
    global _model
    if _model is None:
        _model = ChatGoogleGenerativeAI(
            model=settings.gemini_model,
            google_api_key=settings.gemini_api_key,
            max_tokens=4000,
            # temperature=0.7,
        )
    return _model


async def call_llm(messages: list[dict], max_retries: int = 5):
    """Invoke the LLM with automatic exponential backoff on quota (429) errors.

    Gemini free-tier quotas are tight, so a single rate-limit shouldn't kill a
    whole generation — we wait and retry a few times before giving up.
    """
    llm = get_llm()
    backoff = 2.0
    last_err: Exception | None = None
    for attempt in range(max_retries):
        try:
            return await llm.ainvoke(messages)
        except Exception as e:  # noqa: BLE001 - we inspect the message to decide
            msg = str(e)
            is_quota = "429" in msg or "RESOURCE_EXHAUSTED" in msg
            last_err = e
            if is_quota and attempt < max_retries - 1:
                await asyncio.sleep(backoff)
                backoff *= 2
                continue
            raise
    raise last_err or RuntimeError("LLM call failed after retries")


def extract_json(text: str) -> dict:
    """LLMs sometimes wrap JSON in prose or code fences — pull the object out safely.
    Handles both string responses and Gemini's list-of-content-blocks format."""
    # Handle Gemini's list format: [{"type": "text", "text": "..."}]
    if isinstance(text, list) and text:
        first = text[0]
        if isinstance(first, dict) and "text" in first:
            text = first["text"]

    if not isinstance(text, str):
        text = str(text)

    text = text.strip()
    text = re.sub(r"^```(json)?|```$", "", text, flags=re.MULTILINE).strip()

    # Try to find a JSON object
    match = re.search(r"\{.*\}", text, flags=re.DOTALL)
    if not match:
        raise ValueError(f"No JSON object found in LLM response: {text[:200]}")

    json_str = match.group(0)

    # Fix common JSON issues from LLMs
    json_str = re.sub(r"(?<!\\)'(?=\s*:)", '"', json_str)  # keys
    json_str = re.sub(r":\s*'([^']*)'(?=\s*[,}])", r': "\1"', json_str)  # string values
    json_str = re.sub(r",\s*([}\]])", r"\1", json_str)  # trailing commas

    try:
        return json.loads(json_str)
    except json.JSONDecodeError as e:
        # Fallback: try to find a smaller valid JSON object
        for i in range(len(json_str), 0, -1):
            try:
                return json.loads(json_str[:i])
            except json.JSONDecodeError:
                continue
        raise ValueError(f"Failed to parse JSON from LLM response: {e}\nRaw: {text[:500]}")

