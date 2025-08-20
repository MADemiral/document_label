from fastapi import FastAPI, HTTPException
from operations import (
    create_document_db,
    add_label_to_document,
    get_all_labels, 
    search_labels_by_name, 
    get_label_with_document_count,
    search_documents_by_label,
    get_label_name,
    get_db_session,
    get_all_documents_from_db,
    search_documents_by_label_db,
    delete_all_documents_db,
    delete_document_by_id
)
from pydantic import BaseModel
from typing import List, Optional
import requests
import logging
logger = logging.getLogger()
app = FastAPI()

class LabelSuggestionInput(BaseModel):
    query: str
    limit: Optional[int] = 10

class SearchInput(BaseModel):
    query: str
    limit: Optional[int] = 10

class ConfirmDocumentRequest(BaseModel):
    title: str
    content: str
    summary: str
    labels: List[str]
    fileName: Optional[str] = None

@app.delete("/delete-all-documents")
async def delete_all_documents():
    """Delete all documents"""
    
    # Database'den sil
    try:
        deleted_count = delete_all_documents_db()
        logger.info(f"Deleted {deleted_count} documents from database")
    except Exception as e:
        logger.error(f"Database deletion failed: {e}")
        raise HTTPException(status_code=500, detail=f"Error deleting documents: {str(e)}")
    
    # Embeddings'i sil
    try:
        response = requests.delete(
            "http://localhost:8001/delete-all-documents-embeddings",
        )
        if response.status_code == 200:
            logger.info("Successfully deleted embeddings")
        else:
            logger.warning(f"Embeddings deletion returned: {response.status_code}")
            raise HTTPException(
                status_code=500, 
                detail=f"Error deleting embeddings: HTTP {response.status_code}"
            )
    except requests.exceptions.RequestException as e:
        logger.error(f"Embeddings deletion failed: {e}")
        raise HTTPException(status_code=500, detail=f"Error deleting document embeddings: {str(e)}")
    
    return {
        "message": "All documents deleted successfully",
        "deleted_count": deleted_count
    }


@app.delete("/delete-document/{document_id}")
async def delete_document(document_id: int):
    """Delete a document by ID"""
    if not document_id:
        raise HTTPException(status_code=400, detail="Invalid document ID")

    success = delete_document_by_id(document_id)
    if not success:
        raise HTTPException(status_code=404, detail="Document not found")
    success = requests.delete(f"http://localhost:8001/delete-document-embedding/{document_id}")
    if not success:
        raise HTTPException(status_code=404, detail="Document Embedding not found")

    return {"message": "Document deleted successfully"}


@app.get("/documents/{document_id}")
async def get_document(document_id: int):
    """Get a document by ID"""
    document = get_document_by_id(document_id)
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    return document

@app.get("/get-all-documents")
def get_all_documents():
    """Get all documents from the database"""
    documents = get_all_documents_from_db()
    return {"documents": documents}

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


@app.post("/create-document")
async def create_document(request: ConfirmDocumentRequest):
     
    try:
        clean_labels = [label.strip() for label in request.labels if label.strip()]
        document = create_document_db(
            title=request.title,
            content=request.content,
            summary=request.summary,
            file=None  # Form'dan dosya gelmeyecek
        )
        print(f"Document created with ID: {document.document_id}")
        if not document:
            raise HTTPException(status_code=500, detail="Failed to create document")
        # Save labels and link to document
        try:
            for label in clean_labels:
                add_label_to_document(document.document_id, label)
            print(f"Added {len(clean_labels)} labels to document")
        except Exception as label_error:
            print(f"Label linking error: {label_error}")
            raise HTTPException(
                status_code=500,
                detail=f"Failed to link labels: {str(label_error)}"
            )
        return {
            "status": "saved",
            "title": request.title,
            "document_id": document.document_id,
            "labels": clean_labels,
            "summary": request.summary,
            "message": "Document saved successfully",
            "filename": request.fileName
        }
      
    except Exception as e:
        print(f"Create document error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to create document: {str(e)}")

@app.get("/get-labels")
async def get_labels():
    try:
        labels = await fetch_all_labels()
        return {"labels": labels}
    except Exception as e:
        print(f"Get labels error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get labels: {str(e)}")