import chromadb
from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity
import numpy as np

client = chromadb.HttpClient(host="localhost", port=8000)
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

def save_document_embedding(document_id: int,title: str, content: str, summary: str, labels: list[str]):
    embedding = create_embedding(content)

    metadata = {
        "document_id": document_id,
        "title": title,
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
    """
    Semantic search yaparak sadece döküman bilgilerini döndürür
    """
    query_embedding = create_embedding(query)
    results = collection.query(query_embeddings=[query_embedding], n_results=top_k)
    
    # ChromaDB sonuçlarını işle ve sadece döküman bilgilerini döndür
    documents = []
    
    if results["ids"] and len(results["ids"][0]) > 0:
        for i in range(len(results["ids"][0])):
            metadata = results["metadatas"][0][i]
            document_data = {
                "document_id": int(metadata["document_id"]),
                "title": metadata.get("title", "Untitled Document"),  # Default değer ekle
                "content": results["documents"][0][i],
                "summary": metadata.get("summary", ""),  # Default değer ekle
                "labels": metadata.get("labels", "").split(", ") if metadata.get("labels") else [],
                "score": results["distances"][0][i],  # Distance'ı similarity score'a çevir
            }
            documents.append(document_data)
            #dökümanları sıralama

            documents.sort(key=lambda x: x["score"], reverse=True)

    return documents

def delete_document_embedding(document_id: int):
    collection.delete(where = {"document_id": document_id})
    print(f"Deleted embedding for document {document_id}")

def delete_all_document_embeddings():
    all_data = collection.get()
    if all_data['ids']:
        collection.delete(ids=all_data['ids'])
        print(f"{len(all_data['ids'])} döküman silindi")
    print("Deleted all document embeddings")