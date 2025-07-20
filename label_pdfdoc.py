import os
import json
import re
import time
import yake
import stanza
from PyPDF2 import PdfReader
from groq import Groq
from keybert import KeyBERT
from dotenv import load_dotenv
from sentence_transformers import SentenceTransformer

# -------------------------------
# Environment Setup
# -------------------------------
load_dotenv()
GROQ_API_KEY = os.getenv("GROQ_API_KEY")

# -------------------------------
# Model Loading
# -------------------------------
print("Loading KeyBERT model...")
sentence_model = SentenceTransformer('paraphrase-multilingual-MiniLM-L12-v2')
kw_model = KeyBERT(model=sentence_model)
print("KeyBERT model loaded.")

print("Loading Stanza Turkish pipeline...")
stanza.download('tr')
nlp_tr = stanza.Pipeline(lang='tr', processors='tokenize,ner', use_gpu=False)
print("Stanza Turkish pipeline ready.\n")

# -------------------------------
# Step 1: Read PDF Text
# -------------------------------
def extract_text_from_pdf(pdf_path):
    try:
        reader = PdfReader(pdf_path)
        text = ""
        for page in reader.pages:
            page_text = page.extract_text()
            if page_text:
                text += page_text + "\n"
        return text.strip()
    except Exception as e:
        print(f"Failed to read PDF {pdf_path}: {e}")
        return ""

# -------------------------------
# Step 2: YAKE Keywords
# -------------------------------
def extract_yake_keywords(text, language="tr", max_keywords=10):
    kw_extractor = yake.KeywordExtractor(lan=language, n=1, top=max_keywords)
    return [kw for kw, score in kw_extractor.extract_keywords(text)]

# -------------------------------
# Step 3: KeyBERT Semantic Keywords
# -------------------------------
def extract_keybert_keywords(text, top_n=10):
    cleaned_text = ' '.join(text.split()[:512])  # Limit word count
    if len(cleaned_text.split()) < 20:
        print("Text too short for KeyBERT.")
        return []

    try:
        start = time.time()
        keywords = kw_model.extract_keywords(
            cleaned_text,
            keyphrase_ngram_range=(1, 2),
            stop_words=None,
            top_n=top_n,
            use_mmr=True,
            diversity=0.7
        )
        print(f"KeyBERT extracted in {time.time() - start:.2f}s")
        return [kw for kw, _ in keywords]
    except Exception as e:
        print(f"KeyBERT failed: {e}")
        return []

# -------------------------------
# Step 4: Named Entities (Stanza)
# -------------------------------
def extract_stanza_entities(text):
    try:
        doc = nlp_tr(text)
        return list({ent.text for sentence in doc.sentences for ent in sentence.ents})
    except Exception as e:
        print(f"Stanza failed: {e}")
        return []

# -------------------------------
# Step 5: Rule-based Patterns
# -------------------------------
def extract_structured_keywords(text):
    return {
        "Tarih": list(set(re.findall(r"\d{2}[./-]\d{2}[./-]\d{4}", text))),
        "Tutar": list(set(re.findall(r"\d[\d.,]*\s*(?:TL|₺)", text))),
        "Şirket Adı": list(set(re.findall(r"[A-ZÇĞİÖŞÜ][a-zçğıöşü]+\s+(?:A\.Ş\.|LTD|Ltd\.|Anonim|Şirketi)", text))),
        "Belge Türü": list(set(re.findall(r"(Teklif|Fatura|Sözleşme|Şartname|Yazışma)", text, re.IGNORECASE))),
        "Sektör": list(set(re.findall(r"(Tekstil|İnşaat|Gıda|Yazılım|Enerji|Taşımacılık)", text, re.IGNORECASE)))
    }

# -------------------------------
# Step 6: Tag Suggestion via Groq
# -------------------------------
def get_groq_labels(text):
    client = Groq(api_key=GROQ_API_KEY)
    try:
        response = client.chat.completions.create(
            model="llama3-70b-8192",
            messages=[
                {"role": "system", "content": (
                    "You're a professional Turkish tagging assistant. "
                    "Given the document below, extract 3–7 relevant topic tags. "
                    "Return only a JSON array of strings. Use concise Turkish tags.")},
                {"role": "user", "content": f"Document:\n{text}"}
            ]
        )
        return json.loads(response.choices[0].message.content.strip())
    except Exception as e:
        print(f"Groq labels failed: {e}")
        return []

# -------------------------------
# Step 7: Critical Keywords via Groq
# -------------------------------
def get_groq_keywords(text):
    client = Groq(api_key=GROQ_API_KEY)
    try:
        response = client.chat.completions.create(
            model="llama3-70b-8192",
            messages=[
                {"role": "system", "content": (
                    "You are a document analysis assistant. "
                    "Extract the most critical and repeated keywords from the document below. "
                    "Include full dates, full telephone numbers, full bank account numbers, and company names. "
                    "Return ONLY a valid JSON array of strings with no extra text or formatting. "
                    "Do NOT include explanations or markdown code fences.")},
                {"role": "user", "content": text}
            ]
        )
        raw_content = response.choices[0].message.content.strip()

        if raw_content.startswith("```") and raw_content.endswith("```"):
            raw_content = '\n'.join(raw_content.split('\n')[1:-1]).strip()

        json_start = raw_content.find('[')
        json_end = raw_content.rfind(']') + 1
        if json_start != -1 and json_end != -1:
            json_str = raw_content[json_start:json_end]
        else:
            json_str = raw_content  # fallback

        return json.loads(json_str)
    except Exception as e:
        print(f"Groq keywords failed: {e}")
        print(f"Response was:\n{raw_content}")
        return []



# -------------------------------
# Step 8: Main Processing Function
# -------------------------------
def process_pdf(pdf_path, output_json):
    print(f"\nProcessing: {pdf_path}")
    text = extract_text_from_pdf(pdf_path)

    if not text:
        print("Empty PDF. Skipping.")
        return

    result = {
        "file": pdf_path,
        "text": text,
        "yake_keywords": extract_yake_keywords(text),
        "keybert_keywords": extract_keybert_keywords(text),
        "structured_keywords": extract_structured_keywords(text),
        "stanza_entities": extract_stanza_entities(text),
        "groq_labels": get_groq_labels(text),
        "groq_critical_keywords": get_groq_keywords(text)
    }

    os.makedirs(os.path.dirname(output_json), exist_ok=True)
    with open(output_json, "w", encoding="utf-8") as f:
        json.dump(result, f, ensure_ascii=False, indent=2)

    print(f"Output saved to: {output_json}")

# -------------------------------
# Entry Point
# -------------------------------
if __name__ == "__main__":
    process_pdf("doc/pdf_doc1.pdf", "out/pdf_doc1_output.json")
    process_pdf("doc/pdf_doc2.pdf", "out/pdf_doc2_output.json")
