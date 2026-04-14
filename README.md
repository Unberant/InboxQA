# Inbox QA

## Table of Contents

- [How It Works](#how-it-works)
- [Prerequisites](#prerequisites)
- [Setup](#setup)
- [Configuration](#configuration)
- [Running the API](#running-the-api)
- [API Reference](#api-reference)
- [Technology Choices](#technology-choices)

---

## How It Works

1. **Ingest** — On startup, the app reads emails from `.mbox` file, extracts plain-text bodies, and stores structured records as JSON.
2. **Embed** — Each email is added into a ChromaDB (persistent storage) collection using its embedding function, chunking by emails and storing metadata like sender and date for filtering.
3. **Retrieve** — When a question arrives, ChromaDB performs a nearest-neighbour search and returns the top-K most relevant emails.
4. **Generate** — The retrieved emails are assembled into a prompt and sent to Claude, which answers using only those sources 

---

## Setup

```bash
# 1. Clone the repo
git clone https://github.com/your-org/inbox-qa.git
cd inbox-qa

# 2. Drop your Gmail export into raw_data/
mkdir -p raw_data
cp /path/to/your/export.mbox raw_data/

# 3. pass .env file 
cp .env.example .env
# then edit .env and add your ANTHROPIC_API_KEY

# 4. Build and start
docker compose up --build
```

The API will be available at `http://localhost:8000`.

---

## Configuration

All configuration is driven by environment variables.

```dotenv
# ── Required ──────────────────────────────────────────────────
ANTHROPIC_API_KEY=sk-ant-...          # Anthropic API key

# ── Model settings (optional) ─────────────────────────────────
ANTHROPIC_MODEL=claude-3-5-sonnet-latest
ANTHROPIC_MAX_TOKENS=800

# ── Vector store (optional) ───────────────────────────────────
VECTOR_STORE_ENABLED=true
VECTOR_STORE_PROVIDER=chromadb
CHROMA_COLLECTION=parsed_records

# ── RAG behaviour (optional) ──────────────────────────────────
RAG_ENABLED=true
RAG_TOP_K=3
```

---

## Running the API

Once the server is running, data ingestion happens automatically on startup — no separate script is needed. Parsed emails are written to `processed_data/parsed_messages.json` and indexed into ChromaDB at `processed_data/chroma/`.

## API Reference

| Method | Path | Description |
|--------|------|-------------|
| `GET`  | `/api/history`     | Returns all parsed emails as a JSON array. |
| `POST` | `/api/question`    | Returns an answer with source references.  |

---

## Technology Choices
 
### 1. Parser — `mailbox` + modular architecture
 
The `.mbox` parsing logic is based on a [community reference implementation](https://gist.github.com/benwattsjones/060ad83efd2b3afc8b229d41f9b246c4#file-gmail_mbox_parser-py-L64) and Python's standard `mailbox` library.

A **modular design** was applied via an abstract `DataParser` base class. This means adding a new data source — a WhatsApp export, a Slack archive, an echo-bot conversation log — requires only implementing a new subclass without touching any other part of the system.
 
---
 
### 2. Vector Store — ChromaDB
 
ChromaDB was chosen for its effective fit with the RAG approach: it handles embedding storage, nearest-neighbour search, and metadata filtering in a single library with with no external service required.
 
**Alternatives considered:**
 
| Option | Verdict |
|---|---|
| **LanceDB** | Considered, but ChromaDB offered a more mature Python API for this use case |
| **pgvector** | Overkill at this scale — adds a full Postgres dependency for a dataset of 50–200 emails; better suited once embeddings and vector filtering need to coexist with relational queries |
 
> **Scaling note:** At 5000+ emails, migrating to pgvector or LanceDB becomes worth, also be more sense in a proper hybrid search pipeline (vector + BM25 keyword search).
 
---
 
### 3. RAG Strategy — Metadata-aware RAG
 
A **metadata RAG** approach was chosen becouse each email is stored with its full structured metadata (sender, recipient, subject, thread ID, labels, date), which is included in the retrieved context passed to the model. This preserves thread and message structure in the answer without any extra reconstruction step.
 
**Approaches considered and rejected:**
 
| Approach | Reason for rejection |
|---|---|
| **Full context injection** | Loses relevant context when the inbox is large; doesn't scale |
| **Hybrid RAG** (vector + keyword) | Excessive complexity for 50–100 emails; worthwhile at larger scale |
| **Fine-tuning** | High cost and  overhead; no clear benefit for a Q&A use case |
 
Keyword/sparse search (e.g. BM25) was also evaluated but deprioritised because the email contained no structured identifiers — no invoice numbers, IDs, error codes, or similar tokens — that would give keyword search a meaningful advantage.
 
---
 
### 4. AI Provider — Anthropic Claude
 
Claude was selected as the generation model because it is the AI provider used by the company(spendbase), and it offers a balance between response quality and cost.
 
**Approximate cost per query:**
 
| Model | Cost per query |
|---|---|
| `claude-haiku-4-5` | ~$0.001 |
| `claude-sonnet-4-6` | ~$0.002–0.003 |
| Web agent (for comparison) | ~$0.02 |

---
 
### 5. Docker
 
The `Dockerfile` uses `python:3.12-slim`.
---
 
### 6. Interface — FastAPI + React frontend
 
A FastAPI backend and a React frontend were built to make the system practical to use and demo. FastAPI was chosen for its async support, automatic `/docs` interface, and `lifespan` context manager that runs the full ingestion pipeline once on startup — no separate CLI step needed. 
The React frontend provides a simple chat-style UI on top of the two API endpoints.
 
---
 
### 7. Potential Future Improvements
 
- **Connect echo-bots from team chats** (Telegram, WhatsApp, Slack, etc.) as additional data sources. Because of the modular architecture, each new source is a new subclass — the rest of the pipeline (embedding, retrieval, generation) stays untouched.
 
- **Real-time email ingestion.** The current flow — manual Google Takeout export → upload → parse — is convenient for a proof of concept but impractical in production. A next step is to replace the export loop with a Gmail API integration or an automation tool that pushes new messages into the pipeline as they arrive.
 
- **Scale the retrieval layer.** At 5000+ emails, it is worth migrating to a more capable database (pgvector, LanceDB) and adding hybrid search (dense vector retrieval + BM25 keyword search) to improve precision on structured queries.
