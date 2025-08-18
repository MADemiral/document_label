from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import sys
import os

# Database operations import'u
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

# Import database operations
from database.operations import (
    create_document,
    add_label_to_document,
    get_all_labels, 
    search_labels_by_name, 
    get_label_with_document_count,
    search_documents_by_label,
    get_label_name,
    get_db_session,
    get_all_documents_from_db,
    search_documents_by_label_db
)

# Import embedding utilities
try:
    from embedding_utils import save_document_embedding, is_duplicate, semantic_search as embedding_semantic_search
except ImportError:
    print("Warning: embedding_utils not found, using mock functions")
    
    def save_document_embedding(*args, **kwargs):
        pass
    
    def is_duplicate(*args, **kwargs):
        return False
    
    def embedding_semantic_search(query, limit=10):
        return []

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

class LabelSuggestionInput(BaseModel):
    query: str
    limit: Optional[int] = 10

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


@app.post("/label-suggestions")
def get_label_suggestions(data: LabelSuggestionInput):
    """Get label suggestions for autocomplete - 3+ characters required"""
    try:
        query = data.query.strip().lower()
        limit = data.limit or 10
        
        # Minimum 3 characters required
        if len(query) < 3:
            return {"suggestions": [], "total": 0, "message": "Minimum 3 characters required"}
        
        print(f"Searching for label suggestions with query: '{query}'")
        
        try:
            # Try database first - orjinal operations.py fonksiyonunu kullan
            matching_labels = get_label_with_document_count(query, limit)
            
            # Format for frontend
            suggestions = []
            for label_data in matching_labels:
                suggestions.append({
                    "id": str(label_data['label_id']),
                    "name": label_data['name'],
                    "category": "label",
                    "count": label_data['document_count']
                })
            
            # Eğer database'den sonuç geldiyse, onu kullan
            if suggestions:
                suggestions.sort(key=lambda x: (
                    not x["name"].lower().startswith(query),  # Exact matches first
                    -x["count"]  # Then by document count
                ))
                
                print(f"Found {len(suggestions)} matching labels from database")
                
                return {
                    "suggestions": suggestions[:limit],
                    "total": len(suggestions)
                }
                
        except Exception as db_error:
            print(f"Database error: {db_error}")
        
        # Fallback to predefined suggestions
        print("Using fallback suggestions")
        predefined_labels = [
            # Turkish labels
            "fatura", "sözleşme", "rapor", "iletişim", "toplantı", 
            "yasal", "proje", "analiz", "belge", "anlaşma", 
            "politika", "prosedür", "kılavuz", "email", "sunum",
            "teklif", "bütçe", "özet", "teknik", "satış", 
            "pazarlama", "insan kaynakları", "eğitim", "muhasebe",
            "finans", "satın alma", "lojistik", "kalite", "güvenlik",
            
            # English labels  
            "contract", "finance", "report", "communication", 
            "meeting", "legal", "invoice", "project", "analysis",
            "document", "agreement", "policy", "procedure", "manual",
            "email", "presentation", "proposal", "budget", "summary",
            "technical", "sales", "marketing", "hr", "training",
            "accounting", "procurement", "logistics", "quality", "security"
        ]
        
        suggestions = []
        for i, label in enumerate(predefined_labels):
            if query in label.lower():
                suggestions.append({
                    "id": str(i + 1),
                    "name": label,
                    "category": "label",
                    "count": 1
                })
        
        # Sort fallback suggestions
        suggestions.sort(key=lambda x: (
            not x["name"].lower().startswith(query),  # Exact matches first
            x["name"]  # Then alphabetically
        ))
        
        print(f"Found {len(suggestions)} fallback suggestions")
        
        return {
            "suggestions": suggestions[:limit],
            "total": len(suggestions)
        }
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Server error: {str(e)}")


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
        
        # Save document to PostgreSQL
        try:
            document = create_document(
                title=request.title, 
                content=request.content, 
                summary=request.summary, 
                file=None  # JSON request'te file yok
            )
            print(f"Document created with ID: {document.document_id}")
        except Exception as db_error:
            print(f"Database error: {db_error}")
            raise HTTPException(
                status_code=500,
                detail=f"Failed to save document: {str(db_error)}"
            )

        # Save labels and link to document
        try:
            for label in clean_labels:
                add_label_to_document(document.document_id, label)
            print(f"Added {len(clean_labels)} labels to document")
        except Exception as label_error:
            print(f"Label linking error: {label_error}")

        # Save embedding
        try:
            save_document_embedding(
                document_id=document.document_id,
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
            "document_id": document.document_id,
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

@app.post("/search-documents-by-label")
def search_documents_by_label(search_input: SearchInput):
    """Search documents by label name"""
    try:
        documents = search_documents_by_label_db(search_input.query, search_input.limit)
        return {"results": documents}
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Search error: {str(e)}")

@app.get("/get-all-documents")
def get_all_documents():
    """Get all documents from the database"""
    documents = get_all_documents_from_db()
    return {"documents": documents}
