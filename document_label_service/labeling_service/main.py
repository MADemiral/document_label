from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from services.label_utils import extract_labels_and_keywords, summarize_with_groq
from services.pdf_utils import extract_text_from_pdf

app = FastAPI()


@app.post("/analyze-document")
async def analyze_document(file: UploadFile = File(...)):
    try:
        if not file:
            raise HTTPException(status_code=400, detail="File is required")
        
        
        file_content = await file.read()
        content = extract_text_from_pdf(file_content)
        result = extract_labels_and_keywords(content)
        summary = summarize_with_groq(content)

        concat_labels_and_keywords = result["labels"] + result["keywords"]
        print(f"Extracted labels: {result['labels']}, keywords: {result['keywords']}")
        
        return {
            "labels": concat_labels_and_keywords,
            "summary": summary,
            "filename": file.filename,
            "content_type": file.content_type
        }
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Server error: {str(e)}")