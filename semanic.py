import os
from sentence_transformers import SentenceTransformer
import numpy as np
from sklearn.metrics.pairwise import cosine_similarity

# 1. out/ klasöründeki txt dosyalarını oku
def load_documents_from_folder(folder_path):
    documents = []
    filenames = []
    for filename in os.listdir(folder_path):
        if filename.endswith(".txt"):
            path = os.path.join(folder_path, filename)
            with open(path, "r", encoding="utf-8") as f:
                text = f.read()
                documents.append(text)
                filenames.append(filename)
    return documents, filenames

# 2. Modeli yükle (Huggingface sentence-transformers modeli)
model_name = "sentence-transformers/distiluse-base-multilingual-cased-v2"
model = SentenceTransformer(model_name)

# 3. Dokümanları embed et
documents, filenames = load_documents_from_folder("out")
doc_embeddings = model.encode(documents, show_progress_bar=True)

# 4. Kullanıcı sorgusu
query = "proforma fatura"

# 5. Sorguyu embed et
query_embedding = model.encode([query])

# 6. Benzerlik hesapla
similarities = cosine_similarity(query_embedding, doc_embeddings)[0]

# 7. En iyi 3 sonucu sırala
top_k = 3
top_indices = similarities.argsort()[-top_k:][::-1]

print(f"Sorgu: {query}\n")
print("En yakın dokümanlar:")
for idx in top_indices:
    print(f"---\nDosya: {filenames[idx]}\nBenzerlik: {similarities[idx]:.4f}\nİçerik (ilk 300 karakter):\n{documents[idx][:300]}...\n")
