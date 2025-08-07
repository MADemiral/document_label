from .models import Document, Label
from .db import SessionLocal
from sqlalchemy import text
from sqlalchemy.orm import joinedload
import logging

logger = logging.getLogger(__name__)

def create_document(content, summary=None):
    session = SessionLocal()
    doc = Document(content=content, summary=summary)
    session.add(doc)
    session.commit()
    session.refresh(doc)
    session.close()
    return doc

def add_label_to_document(document_id, label_name):
    session = SessionLocal()
    label = session.query(Label).filter_by(label_name=label_name).first()
    if not label:
        label = Label(label_name=label_name)
        session.add(label)
        session.commit()
        session.refresh(label)

    doc = session.query(Document).get(document_id)
    doc.labels.append(label)
    session.commit()
    session.close()
    return label

def get_db_session():
    """Get database session"""
    return SessionLocal()

def get_all_labels():
    """Get all labels from database"""
    session = SessionLocal()
    try:
        labels = session.query(Label).all()
        return labels
    except Exception as e:
        logger.error(f"Error getting labels: {e}")
        return []
    finally:
        session.close()

def search_labels_by_name(query: str, limit: int = 10):
    """Search labels by name with query"""
    session = SessionLocal()
    try:
        labels = session.query(Label).filter(
            Label.label_name.ilike(f'%{query}%')
        ).limit(limit).all()
        return labels
    except Exception as e:
        logger.error(f"Error searching labels: {e}")
        return []
    finally:
        session.close()

def get_label_with_document_count(query: str, limit: int = 10):
    """Get labels with document count - orjinal DB structure'a uygun"""
    session = SessionLocal()
    try:
        # Raw SQL query - orjinal init.sql'e uygun
        raw_query = text("""
            SELECT 
                l.label_id,
                l.label_name,
                COUNT(DISTINCT dl.document_id) as document_count
            FROM labels l
            LEFT JOIN document_labels dl ON l.label_id = dl.label_id
            WHERE LOWER(l.label_name) LIKE LOWER(:query)
            GROUP BY l.label_id, l.label_name
            ORDER BY document_count DESC, l.label_name
            LIMIT :limit
        """)
        
        result = session.execute(raw_query, {
            'query': f'%{query}%',
            'limit': limit
        })
        
        labels_data = []
        for row in result:
            labels_data.append({
                'label_id': row.label_id,
                'name': row.label_name,  # Frontend için 'name' olarak dön
                'document_count': row.document_count
            })
        
        return labels_data
        
    except Exception as e:
        logger.error(f"Error getting labels with count: {e}")
        return []
    finally:
        session.close()

def search_documents_by_label(label_name: str):
    """Search documents by label name"""
    session = SessionLocal()
    try:
        # Join documents with labels through document_labels
        raw_query = text("""
            SELECT DISTINCT d.* 
            FROM documents d
            JOIN document_labels dl ON d.document_id = dl.document_id
            JOIN labels l ON dl.label_id = l.label_id
            WHERE LOWER(l.label_name) LIKE LOWER(:label_name)
        """)
        
        result = session.execute(raw_query, {'label_name': f'%{label_name}%'})
        
        documents = []
        for row in result:
            doc = session.query(Document).filter_by(document_id=row.document_id).first()
            if doc:
                documents.append(doc)
        
        return documents
        
    except Exception as e:
        logger.error(f"Error searching documents by label: {e}")
        return []
    finally:
        session.close()

def get_label_name(label_obj):
    """Get label name from label object - orjinal field structure"""
    if hasattr(label_obj, 'label_name') and label_obj.label_name:
        return label_obj.label_name
    else:
        return str(label_obj.label_id) if hasattr(label_obj, 'label_id') else 'Unknown'

def get_all_documents_from_db():
    """Get all documents from database"""
    session = SessionLocal()
    try:
        documents = session.query(Document).options(joinedload(Document.labels)).all()
        return documents
    except Exception as e:
        logger.error(f"Error getting documents: {e}")
        return []
    finally:
        session.close()

def search_documents_by_label_db(label_name: str, limit: int = 10):
    """Search documents by label name in database"""
    session = SessionLocal()
    try:
        label = session.query(Label).filter_by(label_name=label_name).limit(10).first()
        if not label:
            return []

        documents = session.query(Document).join(Document.labels).filter(Label.label_id == label.label_id).all()
        return documents
    except Exception as e:
        logger.error(f"Error searching documents by label: {e}")
        return []
    finally:
        session.close()