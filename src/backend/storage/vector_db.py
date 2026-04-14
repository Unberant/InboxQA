from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Dict, List, Optional

from parser import Message

MessageDict = Dict[str, str]


@dataclass
class SearchResult:
    id: str
    document: str
    metadata: MessageDict
    distance: float | None = None


class VectorDB(ABC):
    @abstractmethod
    def upsert(self, records: List[Message]) -> None:
        """Insert or update parsed records in the backing vector store."""

    @abstractmethod
    def search(
        self,
        query: str,
        top_k: int,
    ) -> List[SearchResult]:
        """Return nearest records for a query."""
