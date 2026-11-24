import json
import re
import time

from groq import Groq, RateLimitError

from app.core.config import settings

_client = None


def get_client() -> Groq:
    global _client
    if _client is None:
        if not settings.GROQ_API_KEY or settings.GROQ_API_KEY == "your-groq-api-key-here":
            raise RuntimeError("GROQ_API_KEY is not configured. Set it in backend/.env")
        _client = Groq(api_key=settings.GROQ_API_KEY)
    return _client


def extract_json(text: str) -> dict | list:
    """Extract JSON from LLM output, tolerating markdown fences."""
    text = text.strip()
    # Remove markdown code fences
    text = re.sub(r"^```(?:json)?\s*", "", text)
    text = re.sub(r"\s*```$", "", text)
    # Find first JSON object or array
    for start_char, end_char in [("{", "}"), ("[", "]")]:
        start = text.find(start_char)
        end = text.rfind(end_char)
        if start != -1 and end != -1 and end > start:
            try:
                return json.loads(text[start : end + 1])
            except json.JSONDecodeError:
                continue
    raise ValueError(f"Could not parse JSON from LLM output: {text[:200]}")


def _create_with_retry(client: Groq, **kwargs):
    """Call Groq with automatic retry on rate limits (429)."""
    for attempt in range(4):
        try:
            return client.chat.completions.create(**kwargs)
        except RateLimitError as e:
            if attempt == 3:
                raise
            # Parse retry hint from error message if present, else exponential backoff
            wait = min(15 * (attempt + 1), 45)
            m = re.search(r"try again in ([\d.]+)s", str(e))
            if m:
                wait = float(m.group(1)) + 1
            time.sleep(wait)


def chat_json(prompt: str, temperature: float = 0.2) -> dict | list:
    """Send prompt to Groq and return parsed JSON."""
    client = get_client()
    response = _create_with_retry(
        client,
        model=settings.GROQ_MODEL,
        messages=[{"role": "user", "content": prompt}],
        temperature=temperature,
        max_tokens=1000,
        response_format={"type": "json_object"},
    )
    content = response.choices[0].message.content
    return extract_json(content)


def chat_messages(messages: list, temperature: float = 0.4, max_tokens: int = 1000) -> str:
    """Multi-turn chat completion with rate-limit retry."""
    client = get_client()
    response = _create_with_retry(
        client,
        model=settings.GROQ_MODEL,
        messages=messages,
        temperature=temperature,
        max_tokens=max_tokens,
    )
    return response.choices[0].message.content


def chat_text(prompt: str, temperature: float = 0.3) -> str:
    client = get_client()
    response = _create_with_retry(
        client,
        model=settings.GROQ_MODEL,
        messages=[{"role": "user", "content": prompt}],
        temperature=temperature,
        max_tokens=1000,
    )
    return response.choices[0].message.content
