from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, List


@dataclass
class Message:
    sender: str
    receiver: str
    cc: str
    date: str
    subject: str
    labels: str
    message_id: str
    in_reply_to: str
    references: str
    thread_id: str
    msg_body: str


@dataclass
class Thread:
    thread_id: str
    messages: List[Message]


class DataParser(ABC):
    @abstractmethod
    def parse(self, source_path: Path) -> List[Message]:
        """Parse raw data source into structured messages."""

    @abstractmethod
    def save_to_json(self, records: List[Message], output_path: Path) -> None:
        """Save parsed messages as JSON."""
