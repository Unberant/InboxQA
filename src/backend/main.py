from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from contextlib import asynccontextmanager

from pathlib import Path

from dotenv import load_dotenv

from parser import GmailMboxParser
from rag import RagEngine
from storage import ChromaVectorDB
from settings import load_settings

from pathlib import Path
import json


@asynccontextmanager
async def lifespan(app: FastAPI):
    load_dotenv()
    root = Path(__file__).parent.parent.parent.resolve()
    settings = load_settings(root)

    parser = GmailMboxParser()
    parsed_messages = parser.parse(settings.raw_data_dir)
    parser.save_to_json(parsed_messages, settings.output_processed_json)

    storage = ChromaVectorDB(
        collection_name=settings.chroma_collection,
        persist_path=settings.chroma_persist_path,
    )
    storage.upsert(parsed_messages)

    rag = RagEngine(
        storage,
        claude_api_key=settings.claude_api_key,
        claude_model=settings.claude_model,
        claude_max_tokens=settings.claude_max_tokens,
    )

    app.state.storage = storage
    app.state.settings = settings
    app.state.rag = rag
    yield


app = FastAPI(title="Inbox QA API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/history")
async def get_history():
    try:
        with open(
            app.state.settings.output_processed_json, "r", encoding="utf-8"
        ) as file:
            return json.load(file)
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="History not found")


class QuestionRequest(BaseModel):
    question: str


@app.post("/api/question")
def get_answer(payload: QuestionRequest) -> dict:
    if not payload.question.strip():
        raise HTTPException(status_code=400, detail="Question cannot be empty")

    rag_answer = app.state.rag.answer(payload.question, app.state.settings.rag_top_k)

    return {
        "answer": rag_answer.answer,
        "contexts": [
            {
                "id": context.id,
            }
            for context in rag_answer.contexts
        ],
    }
