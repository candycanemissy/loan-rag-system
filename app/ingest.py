import os
from pathlib import Path
from dotenv import load_dotenv

from langchain_community.document_loaders import PyPDFLoader
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_community.vectorstores import SupabaseVectorStore
from supabase import create_client

load_dotenv()
import os
print("SUPABASE_URL:", os.getenv("SUPABASE_URL"))
print("SUPABASE_KEY:", os.getenv("SUPABASE_KEY")[:20] if os.getenv("SUPABASE_KEY") else "None")
# --- Clients ---
supabase_client = create_client(
    os.getenv("SUPABASE_URL"),
    os.getenv("SUPABASE_KEY")
)

embeddings = HuggingFaceEmbeddings(
    model_name="sentence-transformers/all-mpnet-base-v2"
)

# --- Load PDFs ---
def load_pdfs(docs_dir: str = "docs") -> list:
    documents = []
    pdf_files = list(Path(docs_dir).glob("*.pdf"))

    if not pdf_files:
        raise ValueError(f"No PDFs found in '{docs_dir}' folder")

    print(f"Found {len(pdf_files)} PDF(s)")

    for pdf_path in pdf_files:
        print(f"Loading: {pdf_path.name}")
        loader = PyPDFLoader(str(pdf_path))
        documents.extend(loader.load())

    print(f"Total pages loaded: {len(documents)}")
    return documents

# --- Split into chunks ---
def split_documents(documents: list) -> list:
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=500,
        chunk_overlap=50,
        separators=["\n\n", "\n", ".", " "]
    )
    chunks = splitter.split_documents(documents)
    print(f"Total chunks created: {len(chunks)}")
    return chunks

# --- Embed and store in Supabase ---
def store_embeddings(chunks: list):
    print("Embedding and storing in Supabase pgvector...")

    texts = [chunk.page_content for chunk in chunks]
    metadatas = [chunk.metadata for chunk in chunks]

    # Generate embeddings manually
    vectors = embeddings.embed_documents(texts)

    # Insert row by row directly
    rows = []
    for text, metadata, vector in zip(texts, metadatas, vectors):
        rows.append({
            "content": text,
            "metadata": metadata,
            "embedding": vector
        })

    # Batch insert into Supabase
    batch_size = 10
    for i in range(0, len(rows), batch_size):
        batch = rows[i:i+batch_size]
        supabase_client.table("documents").insert(batch).execute()
        print(f"Inserted chunks {i+1} to {min(i+batch_size, len(rows))}")

    print(f"Done! {len(rows)} chunks stored in Supabase.")

# --- Main ---
if __name__ == "__main__":
    docs = load_pdfs("docs")
    chunks = split_documents(docs)
    store_embeddings(chunks)