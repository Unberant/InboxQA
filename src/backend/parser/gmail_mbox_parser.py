import json
from pathlib import Path
from typing import List
import mailbox
import bs4
from bs4 import FeatureNotFound

from parser import DataParser, Message


class GmailMboxParser(DataParser):
    def __init__(self) -> None:
        super().__init__()

    def parse(self, source_path: Path) -> List[Message]:
        mbox_obj = self._get_mbox(source_path)

        msgs: List[Message] = []
        for idx, email_obj in enumerate(mbox_obj):
            msg = self._parse_email(email_obj)
            msgs.append(msg)
        return msgs

    def save_to_json(self, records: List[Message], output_path: Path) -> None:
        output_path.parent.mkdir(parents=True, exist_ok=True)
        payload = [record.__dict__ for record in records]
        output_path.write_text(
            json.dumps(payload, indent=2, ensure_ascii=False), encoding="utf-8"
        )

    def _get_mbox(self, start_dir: Path) -> mailbox.mbox:
        matches = list(start_dir.rglob("*.mbox"))
        if not matches:
            raise FileNotFoundError(f"No .mbox file found under: {start_dir}")

        mbox_obj = mailbox.mbox(matches[0])
        return mbox_obj

    def _parse_email(self, email_obj: mailbox.mboxMessage) -> Message:
        return Message(
            sender=email_obj["From"],
            receiver=email_obj["To"],
            cc=email_obj["Cc"],
            date=email_obj["Date"],
            subject=email_obj["Subject"],
            labels=email_obj["X-Gmail-Labels"],
            message_id=email_obj["Message-ID"],
            in_reply_to=email_obj["In-Reply-To"],
            references=email_obj["References"],
            thread_id=email_obj["X-GM-THRID"],
            msg_body=self.read_email_payload(email_obj),
        )

    def read_email_payload(self, email_obj: mailbox.mboxMessage) -> str:
        email_payload = email_obj.get_payload()
        if email_obj.is_multipart():
            email_messages = list(self._get_email_messages(email_payload))
        else:
            email_messages = [email_payload]
        text = [self._read_email_text(msg) for msg in email_messages]
        return "\n".join(part[2] for part in text if part and part[2])

    def _get_email_messages(self, email_payload):
        for msg in email_payload:
            if isinstance(msg, (list, tuple)):
                for submsg in self._get_email_messages(msg):
                    yield submsg
            elif msg.is_multipart():
                for submsg in self._get_email_messages(msg.get_payload()):
                    yield submsg
            else:
                yield msg

    def _decode_part_payload(self, msg) -> str:
        payload = msg.get_payload(decode=True)
        if payload is None:
            maybe_text = msg.get_payload()
            return maybe_text if isinstance(maybe_text, str) else ""

        charset = msg.get_content_charset() or "utf-8"
        try:
            return payload.decode(charset, errors="replace")
        except LookupError:
            return payload.decode("utf-8", errors="replace")

    def _read_email_text(self, msg):
        content_type = "NA" if isinstance(msg, str) else msg.get_content_type()
        encoding = (
            "NA" if isinstance(msg, str) else msg.get("Content-Transfer-Encoding", "NA")
        )
        if "text/plain" in content_type and "base64" not in encoding:
            msg_text = msg.get_payload()
        elif "text/html" in content_type and "base64" not in encoding:
            msg_text = get_html_text(msg.get_payload())
        elif content_type == "NA":
            msg_text = str(msg)
        else:
            msg_text = None
        return (content_type, encoding, msg_text)


def get_html_text(html):
    try:
        return bs4.BeautifulSoup(html, "lxml").body.get_text(" ", strip=True)
    except FeatureNotFound:
        body = bs4.BeautifulSoup(html, "html.parser").body
        return body.get_text(" ", strip=True) if body else None
    except AttributeError:
        return None
