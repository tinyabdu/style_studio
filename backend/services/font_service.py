"""Simple mood -> Google Font pairing. Deterministic and free — no LLM call
needed for this; swap in an LLM-driven picker later if you want more nuance."""

PAIRS = [
    {"keywords": ["bold", "energetic", "loud"], "headline": "Poppins", "body": "Inter"},
    {"keywords": ["elegant", "luxury", "minimal"], "headline": "Playfair Display", "body": "Lato"},
    {"keywords": ["playful", "fun", "friendly"], "headline": "Baloo 2", "body": "Nunito"},
    {"keywords": ["corporate", "professional", "clean"], "headline": "Montserrat", "body": "Source Sans Pro"},
    {"keywords": ["retro", "vintage"], "headline": "Abril Fatface", "body": "Josefin Sans"},
    {"keywords": ["tech", "futuristic", "modern"], "headline": "Space Grotesk", "body": "IBM Plex Sans"},
]

DEFAULT = {"headline": "Poppins", "body": "Inter"}


def pick_font_pair(mood: str) -> dict[str, str]:
    mood_lower = mood.lower()
    for pair in PAIRS:
        if any(kw in mood_lower for kw in pair["keywords"]):
            return {"headline": pair["headline"], "body": pair["body"]}
    return DEFAULT
