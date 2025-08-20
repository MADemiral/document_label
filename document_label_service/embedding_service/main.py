from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import requests
from typing import List, Optional
import sys
import os
from embedding_utils import (
    save_document_embedding,
    is_duplicate,
    semantic_search as embedding_semantic_search,
    delete_document_embedding,
    delete_all_document_embeddings
)




app = FastAPI(
    title="Document Label Service",
    description="API for document analysis and labeling with suggestions",
    version="1.0.0"
)



class SearchInput(BaseModel):
    query: str
    limit: Optional[int] = 10

class ConfirmInput(BaseModel):
    title: str
    content: str
    summary: str
    labels: List[str]
    fileName: Optional[str] = None
    # file field'ini kaldır - UploadFile ile ayrı alacağız


class AnalyzeInput(BaseModel):
    content: str

@app.get("/")
def read_root():
    return {"message": "Document Label Service API", "status": "running"}

@app.post("/analyze")
def analyze_document(data: AnalyzeInput):
    """Analyze document content and generate labels/summary"""
    try:
        content = data.content.lower()
        words = content.split()
        
        # Generate simple labels based on content
        labels = []
        if "contract" in content or "agreement" in content:
            labels.append("contract")
        if "invoice" in content or "payment" in content:
            labels.append("finance")
        if "report" in content:
            labels.append("report")
        if "email" in content:
            labels.append("communication")
        if "meeting" in content:
            labels.append("meeting")
        
        # Add some word-based labels
        important_words = [word for word in words if len(word) > 4 and word.isalpha()]
        labels.extend(important_words[:3])
        
        # Generate summary
        summary = data.content[:200] + "..." if len(data.content) > 200 else data.content
        
        return {
            "labels": list(set(labels))[:5],
            "summary": summary
        }
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Analysis error: {str(e)}")



@app.get("/health")
def health_check():
    return {"status": "healthy", "service": "document-label-service"}

class ConfirmDocumentRequest(BaseModel):
    title: str
    content: str
    summary: str
    labels: List[str]
    fileName: Optional[str] = None

@app.post("/confirm-document")
async def confirm_document(request: ConfirmDocumentRequest):
    """Save confirmed document with labels - JSON version"""
    try:
        print(f"Received JSON data:")
        print(f"  title: {request.title}")
        print(f"  content length: {len(request.content) if request.content else 0}")
        print(f"  summary length: {len(request.summary) if request.summary else 0}")
        print(f"  labels: {request.labels}")
        print(f"  fileName: {request.fileName}")
        
        if not request.content or not request.labels:
            raise HTTPException(
                status_code=400, 
                detail="Content and at least one label are required"
            )

        # Clean labels
        clean_labels = [label.strip() for label in request.labels if label.strip()]
        
        if not clean_labels:
            raise HTTPException(
                status_code=400, 
                detail="At least one valid label is required"
            )

        # Check similarity before saving
        try:
            if is_duplicate(request.content):
                return {
                    "status": "duplicate_skipped",
                    "message": "A similar document already exists. Skipping save.",
                    "title": request.title,
                    "labels": clean_labels,
                    "summary": request.summary
                }
        except Exception as dup_error:
            print(f"Duplicate check error (continuing): {dup_error}")

        result = requests.post("http://localhost:8003/create-document", json=request.dict())
        if result.status_code != 200:
            print(f"Document creation error: {result.text}")
            raise HTTPException(status_code=500, detail=f"Failed to create document: {result.text}")
        result = result.json()
        print(result)
        document_id = result.get("document_id")    
        # Save embedding
        try:
            save_document_embedding(
                document_id=document_id,
                title=request.title,
                content=request.content,
                summary=request.summary,
                labels=clean_labels
            )
            print("Document embedding saved")
        except Exception as embed_error:
            print(f"Embedding save error (continuing): {embed_error}")

        return {
            "status": "saved",
            "document_id": document_id,
            "title": request.title,
            "labels": clean_labels,
            "summary": request.summary,
            "message": "Document saved successfully",
            "filename": request.fileName
        }
        
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        print(f"Unexpected error: {e}")
        raise HTTPException(status_code=500, detail=f"Server error: {str(e)}")

# Form version için ayrı endpoint (file upload için)
@app.post("/confirm-document-with-file")
async def confirm_document_with_file(
    title: str = Form(...),
    content: str = Form(...),
    summary: str = Form(...),
    labels: str = Form(...),
    fileName: Optional[str] = Form(None),
    file: Optional[UploadFile] = File(None)
):
    """Save confirmed document with file upload - Form version"""
    # Mevcut Form kodu buraya
    pass
@app.post("/semantic-search")
async def semantic_search(search_input: SearchInput):
    try:
        results = embedding_semantic_search(search_input.query, top_k=search_input.limit)
        
        return {
            "results": results,
            "total": len(results)
        }
    except Exception as e:
        print(f"Semantic search error: {e}")
        # Fallback response
        return {
            "results": [],
            "total": 0,
            "error": str(e)
        }


@app.delete("/delete-document-embedding/{document_id}")
async def delete_document(document_id: int):
    try:
        delete_document_embedding(document_id)
        return {"status": "success", "message": f"Document {document_id} deleted"}
    except Exception as e:
        print(f"Delete document error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to delete document: {str(e)}")

@app.delete("/delete-all-documents-embeddings")
async def delete_all_documents():
    try:
        delete_all_document_embeddings()
        return {"status": "success", "message": "All documents deleted"}
    except Exception as e:
        print(f"Delete all documents error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to delete all documents: {str(e)}")
