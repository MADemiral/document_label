from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from embedding_service.services.embedding_utils import save_document_embedding, is_duplicate, semantic_search
from database.operations import create_document, add_label_to_document
from embedding_service.services.embedding_utils import save_document_embedding, is_duplicate, semantic_search

app = FastAPI()

class SearchInput(BaseModel):
    query: str


class ConfirmInput(BaseModel):
    content: str
    summary: str
    labels: list[str]

@app.post("/search")
def search(data: SearchInput):
    try:
        results = semantic_search(data.query)
        cleaned = []

        for i, doc_id in enumerate(results["ids"][0]):
            cleaned.append({
                "document_id": results["metadatas"][0][i]["document_id"],
                "summary": results["metadatas"][0][i]["summary"],
                "labels": results["metadatas"][0][i]["labels"],
                "score": results["distances"][0][i],
            })

        return {"results": cleaned}
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Server error: {str(e)}")
    

@app.post("/confirm-document")
def confirm_document(data: ConfirmInput):
    if not data.content or not data.labels:
        raise HTTPException(status_code=400, detail="Content and labels are required")

    # Check similarity before saving
    if is_duplicate(data.content):
        return {
            "status": "duplicate_skipped",
            "message": "A similar document already exists. Skipping save."
        }

    # Save document to PostgreSQL
    document = create_document(content=data.content, summary=data.summary)

    # Save labels and link to document
    for label in data.labels:
        add_label_to_document(document.document_id, label)

    # Save embedding with metadata to ChromaDB
    save_document_embedding(
        document_id=document.document_id,
        content=data.content,
        summary=data.summary,
        labels=data.labels
    )

    return {
        "status": "saved",
        "document_id": document.document_id,
        "labels": data.labels,
        "summary": data.summary
    }