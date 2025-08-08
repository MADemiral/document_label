import chromadb
from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity
import numpy as np

client = chromadb.HttpClient(host="chromadb", port=8000)
collection = client.get_or_create_collection("documents")

embedding_model = SentenceTransformer("paraphrase-multilingual-MiniLM-L12-v2")

def create_embedding(text: str):
    return embedding_model.encode(text).tolist()

def is_duplicate(content: str, threshold=0.95):
    """Check if content embedding is similar to existing docs."""
    embedding = create_embedding(content)
    if collection.count() == 0:
        return False

    results = collection.query(query_embeddings=[embedding], n_results=1)

    if results["distances"] and len(results["distances"][0]) > 0:
        # Chroma distances are L2, convert to cosine similarity manually if needed
        # For simplicity, treat 1 - distance as similarity approximation
        distance = results["distances"][0][0]
        similarity = 1 - distance if distance <= 1 else 0
        return similarity >= threshold
    return False

def save_document_embedding(document_id: int, content: str, summary: str, labels: list[str]):
    embedding = create_embedding(content)

    metadata = {
        "document_id": document_id,
        "summary": summary,
        "labels": ", ".join(labels) if labels else ""
    }

    collection.add(
        ids=[str(document_id)],
        embeddings=[embedding],
        documents=[content],
        metadatas=[metadata]
    )
    print(f"Saved embedding for document {document_id}")

def semantic_search(query: str, top_k=3):
    query_embedding = create_embedding(query)
    results = collection.query(query_embeddings=[query_embedding], n_results=top_k)
    return results
