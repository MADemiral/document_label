from sqlalchemy import Column, Integer, Text, TIMESTAMP, ForeignKey, String
from sqlalchemy.orm import relationship
from .db import Base
from datetime import datetime

class Document(Base):
    __tablename__ = "documents"
    document_id = Column(Integer, primary_key=True, index=True)
    title = Column(Text)
    content = Column(Text)
    uploaded_at = Column(TIMESTAMP, default=datetime.utcnow)
    created_at = Column(TIMESTAMP, default=datetime.utcnow)
    summary = Column(Text)

    labels = relationship("Label", secondary="document_labels", back_populates="documents")

class Label(Base):
    __tablename__ = "labels"
    label_id = Column(Integer, primary_key=True, index=True)
    label_name = Column(String(255), unique=True, nullable=False)

    documents = relationship("Document", secondary="document_labels", back_populates="labels")

class DocumentLabel(Base):
    __tablename__ = "document_labels"
    document_id = Column(Integer, ForeignKey("documents.document_id"), primary_key=True)
    label_id = Column(Integer, ForeignKey("labels.label_id"), primary_key=True)