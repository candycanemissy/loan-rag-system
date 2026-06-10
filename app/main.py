import os
import time
import logging
import traceback
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
from dotenv import load_dotenv

load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="DocAI", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

class QuestionRequest(BaseModel):
    question: str

class AnswerResponse(BaseModel):
    answer: str
    sources: list
    success: bool
    response_time_ms: float

@app.get("/health")
def health_check():
    return {"status": "healthy", "version": "1.0.0"}

@app.post("/ask", response_model=AnswerResponse)
def ask_question(request: QuestionRequest):
    if not request.question.strip():
        raise HTTPException(status_code=400, detail="Question cannot be empty")
    if len(request.question) > 500:
        raise HTTPException(status_code=400, detail="Question too long (max 500 chars)")

    logger.info(f"Question: {request.question}")
    start = time.time()

    try:
        from app.rag import answer_question
        result = answer_question(request.question)
    except Exception as e:
        logger.error(f"RAG error: {e}\n{traceback.format_exc()}")
        result = {
            "answer": "Sorry, I encountered an error.",
            "sources": [],
            "success": False,
        }

    elapsed = round((time.time() - start) * 1000, 2)
    logger.info(f"Done in {elapsed}ms | success={result['success']}")

    return AnswerResponse(
        answer=result["answer"],
        sources=result["sources"],
        success=result["success"],
        response_time_ms=elapsed,
    )

# Serve React frontend — must be last
static_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "static")
if os.path.exists(static_dir):
    assets_dir = os.path.join(static_dir, "assets")
    if os.path.exists(assets_dir):
        app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

    @app.get("/")
    @app.get("/{full_path:path}")
    def serve_frontend(full_path: str = ""):
        index = os.path.join(static_dir, "index.html")
        return FileResponse(index)