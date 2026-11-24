"""Document processor node — extracts text from uploaded files."""
import os

import fitz  # PyMuPDF

from app.ai.state import InvestigationState


def extract_text_from_file(file_path: str) -> str:
    ext = os.path.splitext(file_path)[1].lower()
    if ext == ".pdf":
        doc = fitz.open(file_path)
        text = "\n".join(page.get_text() for page in doc)
        doc.close()
        return text
    # Treat everything else as plain text
    with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
        return f.read()


def document_processor(state: InvestigationState) -> dict:
    """Extract text from uploaded document or use pasted text."""
    text = state.get("raw_text", "")

    file_path = state.get("file_path")
    if file_path and os.path.exists(file_path):
        try:
            file_text = extract_text_from_file(file_path)
            text = f"{text}\n\n{file_text}".strip() if text else file_text
        except Exception as e:
            return {"error": f"Failed to extract text from file: {e}"}

    if not text.strip():
        return {"error": "No input text or file provided"}

    return {"document_text": text}
