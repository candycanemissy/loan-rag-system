import os
import logging
import traceback
from dotenv import load_dotenv
from langchain_huggingface import HuggingFaceEmbeddings, HuggingFaceEndpoint, ChatHuggingFace
from langchain_core.messages import HumanMessage
from supabase import create_client

load_dotenv()

logger = logging.getLogger(__name__)

# --- Clients ---
supabase_client = create_client(
    os.getenv("SUPABASE_URL"),
    os.getenv("SUPABASE_KEY")
)

embeddings = HuggingFaceEmbeddings(
    model_name="sentence-transformers/all-mpnet-base-v2"
)

# --- LLM ---
llm_endpoint = HuggingFaceEndpoint(
    repo_id="mistralai/Mistral-7B-Instruct-v0.2",
    huggingfacehub_api_token=os.getenv("HUGGINGFACEHUB_API_TOKEN"),
    task="conversational",
    max_new_tokens=512
)

llm = ChatHuggingFace(llm=llm_endpoint)

# --- Prompt ---
prompt_template = """You are a helpful loan document assistant.
Use the following context from loan documents to answer the question.
If you don't know the answer, say "I don't have enough information in the documents to answer that."

Context:
{context}

Question: {question}

Answer:"""

# --- Retrieval ---
def retrieve_chunks(question: str, k: int = 4) -> list:
    vector = embeddings.embed_query(question)
    response = supabase_client.rpc("match_documents", {
        "query_embedding": vector,
        "match_count": k,
        "filter": {}
    }).execute()
    return response.data or []

# --- Main ---
def answer_question(question: str) -> dict:
    try:
        chunks = retrieve_chunks(question)

        if not chunks:
            return {
                "answer": "I couldn't find relevant information in the documents.",
                "sources": [],
                "success": True
            }

        context = "\n\n".join([c["content"] for c in chunks])
        sources = list(set([
            c.get("metadata", {}).get("source", "unknown")
            for c in chunks
        ]))

        prompt = prompt_template.format(context=context, question=question)
        response = llm.invoke([HumanMessage(content=prompt)])

        return {
            "answer": response.content.strip(),
            "sources": sources,
            "success": True
        }

    except Exception as e:
        logger.error(f"RAG error: {e}\n{traceback.format_exc()}")
        return {
            "answer": "Sorry, I encountered an error processing your question.",
            "sources": [],
            "success": False,
            "error": str(e)
        }