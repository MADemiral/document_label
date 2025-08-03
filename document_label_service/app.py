from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from services.label_extraction import extract_labels_and_keywords, summarize_with_groq
from database.operations import create_document, add_label_to_document
from services.embedding_service import save_document_embedding, is_duplicate

app = FastAPI()

class DocumentInput(BaseModel):
    content: str

class ConfirmInput(BaseModel):
    content: str
    summary: str
    labels: list[str]

class SearchInput(BaseModel):
    query: str
    
@app.post("/analyze-document")
def analyze_document(doc: DocumentInput):
    try:
        if not doc.content:
            raise HTTPException(status_code=400, detail="Content is required")

        result = extract_labels_and_keywords(doc.content)
        summary = summarize_with_groq(doc.content)

        concat_labels_and_keywords = result["labels"] + result["keywords"]

        return {
            "labels": concat_labels_and_keywords,
            "summary": summary
        }
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Server error: {str(e)}")
    


from services.embedding_service import semantic_search

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