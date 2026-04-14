from __future__ import annotations

import hashlib
from pathlib import Path
from typing import Dict, List, Optional

import chromadb
from chromadb.utils import embedding_functions

from storage import VectorDB, SearchResult
from parser import Message


class ChromaVectorDB(VectorDB):
    def __init__(self, *, collection_name: str, persist_path: Path) -> None:
        persist_path.mkdir(parents=True, exist_ok=True)
        client = chromadb.PersistentClient(path=str(persist_path))
        self.collection = client.get_or_create_collection(
            name=collection_name,
            embedding_function=embedding_functions.DefaultEmbeddingFunction(),
        )

    def upsert(self, records: List[Message]) -> None:
        if not records:
            return

        ids: List[str] = []
        documents: List[str] = []
        metadatas: List[Dict[str, str]] = []
        for idx, record in enumerate(records):
            ids.append(_record_id(record, idx))
            documents.append(_document_from_record(record))
            metadatas.append(_metadata_from_record(record))

        self.collection.upsert(ids=ids, documents=documents, metadatas=metadatas)

    def search(
        self,
        query: str,
        top_k: int = 3,
        metadata_filter: Optional[Dict[str, str]] = None,
    ) -> List[SearchResult]:
        if not query.strip():
            return []

        where = _build_where_clause(metadata_filter)
        query_args = {
            "query_texts": [query],
            "n_results": max(1, top_k),
            "include": ["documents", "metadatas", "distances"],
        }
        if where is not None:
            query_args["where"] = where
        results = self.collection.query(**query_args)

        ids = (results.get("ids") or [[]])[0]
        documents = (results.get("documents") or [[]])[0]
        metadatas = (results.get("metadatas") or [[]])[0]
        distances = (results.get("distances") or [[]])[0]

        output: List[SearchResult] = []
        for i, record_id in enumerate(ids):
            output.append(
                SearchResult(
                    id=record_id,
                    document=documents[i] if i < len(documents) else "",
                    metadata=(
                        metadatas[i] if i < len(metadatas) and metadatas[i] else {}
                    ),
                    distance=distances[i] if i < len(distances) else None,
                )
            )
        return output


def _build_where_clause(
    metadata_filter: Optional[Dict[str, str]],
) -> Optional[Dict[str, str]]:
    if not metadata_filter:
        return None
    where: Dict[str, str] = {}
    for key, value in metadata_filter.items():
        trimmed_key = key.strip()
        trimmed_value = value.strip()
        if trimmed_key and trimmed_value:
            where[trimmed_key] = trimmed_value
    return where or None


def _record_id(record: Message, idx: int) -> str:
    if record.message_id:
        return record.message_id
    else:
        return (
            (record.thread_id or "")
            + "_"
            + hashlib.sha256(record.msg_body.encode("utf-8")).hexdigest()[:16]
            + f"_{idx}"
        )


def _document_from_record(record: Message) -> str:
    return "\n".join(
        [
            f"Subject: {record.subject}",
            f"Author: {record.sender}",
            f"Recipient: {record.receiver}",
            f"Labels: {record.labels}",
            "",
            record.msg_body,
        ]
    ).strip()


def _metadata_from_record(record: Message) -> Dict[str, str]:
    metadata = {
        "thread_id": record.thread_id,
        "message_id": record.message_id,
        "sender": record.sender,
        "receiver": record.receiver,
        "copy_to": record.cc,
        "date": record.date,
        "subject": record.subject,
        "labels": record.labels,
    }
    return metadata
