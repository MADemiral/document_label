from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from services.label_utils import extract_labels_and_keywords, summarize_with_groq


app = FastAPI()


class DocumentInput(BaseModel):
    content: str
    
@app.post("/analyze-document")
async def analyze_document(doc: DocumentInput):
    try:
        if not doc.content:
            raise HTTPException(status_code=400, detail="Content is required")

        result = extract_labels_and_keywords(doc.content)
        summary = summarize_with_groq(doc.content)

        concat_labels_and_keywords = result["labels"] + result["keywords"]
        print(f"Extracted labels: {result['labels']}, keywords: {result['keywords']}")
        return {
            "labels": concat_labels_and_keywords,
            "summary": summary
        }
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Server error: {str(e)}")