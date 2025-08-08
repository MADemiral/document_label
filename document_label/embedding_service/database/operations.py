from .models import Document, Label
from .db import SessionLocal

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
