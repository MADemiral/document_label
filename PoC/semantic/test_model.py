import os
from doctr.io import DocumentFile
from doctr.models import ocr_predictor
from sentence_transformers import SentenceTransformer, util

# OCR model
ocr_model = ocr_predictor(pretrained=True)

# PDF directory
PDF_DIR = "docs"
PDF_FILES = [f for f in os.listdir(PDF_DIR) if f.startswith("pdf_doc") and f.endswith(".pdf")]

# Models to test
MODEL_NAMES = {
    "BERTurk": "dbmdz/bert-base-turkish-cased",
    "XLM-R": "xlm-roberta-base",
    "MiniLM": "paraphrase-multilingual-MiniLM-L12-v2",
    "DistilUSE": "distiluse-base-multilingual-cased-v1"
}

# Step 1: OCR
def extract_text(path):
    doc = DocumentFile.from_pdf(path)
    result = ocr_model(doc)
    return result.render().strip()

# Step 2: Load documents
documents = []
for filename in PDF_FILES:
    path = os.path.join(PDF_DIR, filename)
    text = extract_text(path)
    documents.append({"filename": filename, "text": text})

# Step 3: Embed with each model
model_embeddings = {}
for label, model_name in MODEL_NAMES.items():
    print(f"🔧 Embedding with {label}...")
    model = SentenceTransformer(model_name)
    embeddings = [model.encode(doc["text"], convert_to_tensor=True) for doc in documents]
    model_embeddings[label] = {"model": model, "embeddings": embeddings}

# Step 4: Semantic Search
def search_all_models(query, top_k=3):
    print(f"\n🔍 Query: {query}")
    for label, data in model_embeddings.items():
        print(f"\n🧠 Model: {label}")
        query_emb = data["model"].encode(query, convert_to_tensor=True)
        hits = util.semantic_search(query_emb, data["embeddings"], top_k=top_k)[0]
        for hit in hits:
            doc = documents[hit["corpus_id"]]
            print(f"📄 {doc['filename']} | Score: {hit['score']:.4f}")
            print(f"Preview: {doc['text'][:200]}...\n")

# Example query
search_all_models("15000 tl altındaki fatura")
