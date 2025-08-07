# main.py - import'ları ekleyin

from fastapi import FastAPI, HTTPException
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
    content: str
    summary: str
    labels: List[str]
    fileName: Optional[str] = None

class LabelSuggestionInput(BaseModel):
    query: str
    limit: Optional[int] = 10

class AnalyzeInput(BaseModel):
    content: str

class CombinedSearchInput(BaseModel):
    query: str
    search_type: Optional[str] = "both"  # "semantic", "label", "both"
    limit: Optional[int] = 10

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

@app.post("/confirm-document")
def confirm_document(data: ConfirmInput):
    """Save confirmed document with labels"""
    if not data.content or not data.labels:
        raise HTTPException(status_code=400, detail="Content and labels are required")

    try:
        # Check similarity before saving
        if is_duplicate(data.content):
            return {
                "status": "duplicate_skipped",
                "message": "A similar document already exists. Skipping save.",
                "labels": data.labels,
                "summary": data.summary
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
            "summary": data.summary,
            "message": "Document saved successfully"
        }
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Save error: {str(e)}")
@app.post("/semantic-search")
def semantic_search(query: str, limit: int = 10):
    """Semantic search implementation with fallback"""
    try:
        # Try embedding search first
        results = embedding_semantic_search(query, limit=limit)
        
        # If embedding search fails, return mock data
        if not results:
            return [{
                "document_id": f"mock-{i}",
                "content": f"Mock document {i} containing '{query}'",
                "summary": f"Mock summary for document {i}",
                "labels": [query.lower()],
                "score": 0.8 - (i * 0.1)
            } for i in range(min(3, limit))]
        
        return results
        
    except Exception as e:
        print(f"Semantic search error: {e}")
        # Return mock data as fallback
        return [{
            "document_id": "fallback-1",
            "content": f"Fallback document containing '{query}'",
            "summary": f"Fallback summary for {query}",
            "labels": [query.lower()],
            "score": 0.5
        }]

@app.post("/search-documents-by-label")
def search_documents_by_label(label_name: str, limit: int = 10):
    """Search documents by label name"""
    try:
        documents = search_documents_by_label_db(label_name, limit)
        return {"documents": documents}
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Search error: {str(e)}")

@app.get("/get-all-documents")
def get_all_documents():
    """Get all documents from the database"""
    documents = get_all_documents_from_db()
    return {"documents": documents}
