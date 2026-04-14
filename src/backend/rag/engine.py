from __future__ import annotations

import json
from anthropic import Anthropic
from dataclasses import dataclass
from typing import List

from storage import SearchResult, VectorDB


@dataclass
class RagAnswer:
    answer: str
    contexts: List[SearchResult]


class RagEngine:
    def __init__(
        self,
        vector_store: VectorDB,
        *,
        claude_api_key: str,
        claude_model: str,
        claude_max_tokens: int = 800,
    ) -> None:
        self.vector_store = vector_store
        self.claude_model = claude_model
        self.claude_max_tokens = claude_max_tokens
        self.client = Anthropic(api_key=claude_api_key)

    def retrieve(
        self,
        query: str,
        top_k: int = 3,
    ) -> List[SearchResult]:
        return self.vector_store.search(
            query=query, top_k=top_k
        )

    def answer(
        self,
        query: str,
        top_k: int = 3,
    ) -> RagAnswer:
        contexts = self.retrieve(
            query=query, top_k=top_k
        )
        if not contexts:
            return RagAnswer(
                answer="No matching context found in the vector database.", contexts=[]
            )

        if not self.client.api_key:
            return RagAnswer(
                answer="Claude API key missing. Set ANTHROPIC_API_KEY to enable answer generation.",
                contexts=contexts,
            )

        prompt = _build_rag_prompt(query=query, contexts=contexts)
        answer_text = self.client.messages.create(
            max_tokens=self.claude_max_tokens,
            messages=[{"role": "user", "content": prompt}],
            model=self.claude_model,
        ).content

        text_parts: List[str] = []
        for block in answer_text:
            if block.type == "text":
                text_parts.append((block.text or "").strip())
        answer_text = (
            "\n\n".join(part for part in text_parts if part)
            or "Claude returned no text response."
        )
        return RagAnswer(answer=answer_text, contexts=contexts)


def _build_rag_prompt(query: str, contexts: List[SearchResult]) -> str:
    blocks: List[str] = []
    for i, item in enumerate(contexts, start=1):
        metadata_json = json.dumps(item.metadata, ensure_ascii=False, sort_keys=True)
        blocks.append(
            "\n".join(
                [
                    f"[Context {i}]",
                    f"id: {item.id}",
                    f"distance: {item.distance}",
                    f"metadata: {metadata_json}",
                    "content:",
                    item.document,
                ]
            )
        )
    joined_contexts = "\n\n".join(blocks)
    return (
"""You are a helpful assistant that answers questions about email threads.
Rules:
- Answer ONLY using the provided email sources below.
- Cite every factual claim with [Source N] where N is the source number.
- If multiple sources support a claim, cite all of them: [Source 1][Source 3].
- If the answer cannot be found in the sources, respond with exactly:
  "I couldn't find that information in the provided sources."
- Do not speculate or add information beyond what the sources contain.
- Keep answers concise and direct."""
        f"User question:\n{query}\n\n"
        f"Retrieved contexts:\n{joined_contexts}"
    )