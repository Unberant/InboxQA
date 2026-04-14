from __future__ import annotations

from dataclasses import dataclass
import os
from pathlib import Path


@dataclass
class Settings:
    root: Path
    raw_data_dir: Path
    processed_data_dir: Path
    output_processed_json: Path
    vector_store_enabled: bool
    vector_store_provider: str
    chroma_collection: str
    chroma_persist_path: Path
    rag_enabled: bool
    rag_top_k: int
    claude_api_key: str
    claude_model: str
    claude_max_tokens: int


def load_settings(root: Path) -> Settings:
    return Settings(
        root=root,
        raw_data_dir=root / "raw_data",
        processed_data_dir=root / "processed_data",
        output_processed_json=root / "processed_data" / "parsed_messages.json",
        chroma_persist_path=root / "processed_data" / "chroma",
        vector_store_enabled=os.getenv("VECTOR_STORE_ENABLED", "true").strip().lower()
        == "true",
        vector_store_provider=os.getenv("VECTOR_STORE_PROVIDER", "chromadb")
        .strip()
        .lower(),
        chroma_collection=os.getenv("CHROMA_COLLECTION", "parsed_records").strip(),
        rag_enabled=os.getenv("RAG_ENABLED", "false").strip().lower() == "true",
        rag_top_k=int(os.getenv("RAG_TOP_K", "3").strip()),
        claude_api_key=os.getenv("ANTHROPIC_API_KEY", "").strip(),
        claude_model=os.getenv("ANTHROPIC_MODEL", "claude-3-5-sonnet-latest").strip(),
        claude_max_tokens=int(os.getenv("ANTHROPIC_MAX_TOKENS", "800").strip()),
    )
