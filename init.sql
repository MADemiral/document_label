-- ==============================
--  DOCUMENTS TABLE
-- ==============================
CREATE TABLE documents (
    document_id SERIAL PRIMARY KEY,
    title TEXT,
    content TEXT,
    uploaded_at TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW(),
    summary TEXT,
    file BYTEA
);

-- ==============================
--  LABELS TABLE
-- ==============================
CREATE TABLE labels (
    label_id SERIAL PRIMARY KEY,
    label_name VARCHAR(255) UNIQUE NOT NULL
);

-- ==============================
--  DOCUMENT_LABELS (Many-to-Many)
-- ==============================
CREATE TABLE document_labels (
    document_id INT NOT NULL,
    label_id INT NOT NULL,
    PRIMARY KEY (document_id, label_id),
    FOREIGN KEY (document_id) REFERENCES documents(document_id) ON DELETE CASCADE,
    FOREIGN KEY (label_id) REFERENCES labels(label_id) ON DELETE CASCADE
);

-- ==============================
--  INDEXES FOR PERFORMANCE
-- ==============================
CREATE INDEX idx_documents_title ON documents(title);
CREATE INDEX idx_labels_name ON labels(label_name);
