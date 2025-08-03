from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from services.label_extraction import extract_labels_and_keywords, summarize_with_groq

app = FastAPI()

class DocumentInput(BaseModel):
    content: str

@app.post("/analyze-document")
def analyze_document(doc: DocumentInput):
    try:
        if not doc.content:
            raise HTTPException(status_code=400, detail="Content is required")

        result = extract_labels_and_keywords(doc.content)
        summary = summarize_with_groq(doc.content)

        return {
            "labels": result["labels"],
            "keywords": result["keywords"],
            "summary": summary
        }
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Server error: {str(e)}")
