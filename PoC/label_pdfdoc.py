import os
import json
import re
import time
import logging
import yake
import stanza
import spacy
from PyPDF2 import PdfReader
from groq import Groq
from keybert import KeyBERT
from dotenv import load_dotenv
from sentence_transformers import SentenceTransformer
from concurrent.futures import ThreadPoolExecutor

# -------------------------------
# Setup logging
# -------------------------------
logging.basicConfig(level=logging.INFO, format='%(asctime)s %(levelname)s: %(message)s')

# -------------------------------
# Environment Setup
# -------------------------------
load_dotenv()
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
if not GROQ_API_KEY:
    logging.error("GROQ_API_KEY is missing from environment variables.")
    exit(1)

# -------------------------------
# Model Loading
# -------------------------------
logging.info("Loading KeyBERT model...")
sentence_model = SentenceTransformer('paraphrase-multilingual-MiniLM-L12-v2')
kw_model = KeyBERT(model=sentence_model)
logging.info("KeyBERT model loaded.")

logging.info("Loading Stanza Turkish pipeline...")
stanza.download('tr', verbose=False)
nlp_tr = stanza.Pipeline(lang='tr', processors='tokenize,ner', use_gpu=False)
logging.info("Stanza Turkish pipeline ready.")

logging.info("Loading spaCy model...")
try:
    nlp_spacy = spacy.load("xx_ent_wiki_sm")
except OSError:
    logging.info("Downloading spaCy model...")
    from spacy.cli import download
    download("xx_ent_wiki_sm")
    nlp_spacy = spacy.load("xx_ent_wiki_sm")
logging.info("spaCy model loaded.\n")

# -------------------------------
# Helper: Clean PDF text
# -------------------------------
def clean_pdf_text(text):
    # Normalize whitespace
    text = re.sub(r'\s+', ' ', text)
    # Fix hyphenation across lines
    text = re.sub(r'(?<=\w)-\s+(?=\w)', '', text)
    return text.strip()

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
        cleaned_text = clean_pdf_text(text)
        return cleaned_text
    except Exception as e:
        logging.error(f"Failed to read PDF {pdf_path}: {e}")
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
        logging.warning("Text too short for KeyBERT.")
        return []

    try:
        start = time.time()
        keywords_1 = kw_model.extract_keywords(
            cleaned_text,
            keyphrase_ngram_range=(1, 1),
            stop_words=None,
            top_n=top_n // 2,
            use_mmr=True,
            diversity=0.7
        )
        keywords_2 = kw_model.extract_keywords(
            cleaned_text,
            keyphrase_ngram_range=(2, 2),
            stop_words=None,
            top_n=top_n // 2,
            use_mmr=True,
            diversity=0.7
        )
        keywords = list(set([kw for kw, _ in keywords_1] + [kw for kw, _ in keywords_2]))
        logging.info(f"KeyBERT extracted {len(keywords)} keywords in {time.time() - start:.2f}s")
        return keywords
    except Exception as e:
        logging.error(f"KeyBERT failed: {e}")
        return []

# -------------------------------
# Step 4a: Named Entities (Stanza)
# -------------------------------
def extract_stanza_entities(text):
    try:
        doc = nlp_tr(text)
        return list({ent.text for sentence in doc.sentences for ent in sentence.ents})
    except Exception as e:
        logging.error(f"Stanza failed: {e}")
        return []

# -------------------------------
# Step 4b: Named Entities (spaCy)
# -------------------------------
def extract_spacy_entities(text):
    try:
        doc = nlp_spacy(text)
        return list({ent.text for ent in doc.ents})
    except Exception as e:
        logging.error(f"spaCy failed: {e}")
        return []

# -------------------------------
# Step 4c: Combine entities from both
# -------------------------------
def extract_combined_entities(text):
    stanza_ents = extract_stanza_entities(text)
    spacy_ents = extract_spacy_entities(text)
    combined = list(set(stanza_ents + spacy_ents))
    logging.info(f"Extracted {len(combined)} combined entities (Stanza + spaCy)")
    return combined

# -------------------------------
# Step 5: Rule-based Patterns
# -------------------------------
date_pattern = r'(\d{1,2}\s*(Ocak|Şubat|Mart|Nisan|Mayıs|Haziran|Temmuz|Ağustos|Eylül|Ekim|Kasım|Aralık)\s*\d{4})'
phone_pattern = r'(\+?\d[\d\s.-]{7,}\d)'

def extract_structured_keywords(text):
    try:
        return {
            "Tarih": list(set(re.findall(r"\d{2}[./-]\d{2}[./-]\d{4}", text) + [d[0] for d in re.findall(date_pattern, text)])),
            "Telefon": list(set(re.findall(phone_pattern, text))),
            "Tutar": list(set(re.findall(r"\d[\d.,]*\s*(?:TL|₺)", text))),
            "Şirket Adı": list(set(re.findall(r"[A-ZÇĞİÖŞÜ][a-zçğıöşü]+\s+(?:A\.Ş\.|LTD|Ltd\.|Anonim|Şirketi)", text))),
            "Belge Türü": list(set(re.findall(r"(Teklif|Fatura|Sözleşme|Şartname|Yazışma)", text, re.IGNORECASE))),
            "Sektör": list(set(re.findall(r"(Tekstil|İnşaat|Gıda|Yazılım|Enerji|Taşımacılık)", text, re.IGNORECASE)))
        }
    except Exception as e:
        logging.error(f"Regex extraction failed: {e}")
        return {}

# -------------------------------
# Helper: Chunk text for Groq
# -------------------------------
def chunk_text(text, max_len=3000):
    return [text[i:i+max_len] for i in range(0, len(text), max_len)]

# -------------------------------
# Groq API call with retries & cleanup
# -------------------------------
def call_groq_chat(messages, retries=3, delay=1):
    client = Groq(api_key=GROQ_API_KEY)
    for attempt in range(retries):
        try:
            response = client.chat.completions.create(
                model="llama3-70b-8192",
                messages=messages
            )
            raw_content = response.choices[0].message.content.strip()

            if raw_content.startswith("```") and raw_content.endswith("```"):
                raw_content = '\n'.join(raw_content.split('\n')[1:-1]).strip()

            json_start = raw_content.find('[')
            json_end = raw_content.rfind(']') + 1
            if json_start != -1 and json_end != -1:
                json_str = raw_content[json_start:json_end]
            else:
                json_str = raw_content

            return json.loads(json_str)
        except Exception as e:
            logging.warning(f"Groq API attempt {attempt+1} failed: {e}")
            time.sleep(delay * (2 ** attempt))
    logging.error("Groq API failed after retries.")
    return []

# -------------------------------
# Step 6a: Tag Suggestion via Groq
# -------------------------------
def get_groq_labels(text):
    prompt_system = (
        "You're a professional Turkish tagging assistant. "
        "Given the document below, extract 3–7 relevant topic tags. "
        "Return only a JSON array of strings. Use concise Turkish tags, no extra text."
    )
    messages = [
        {"role": "system", "content": prompt_system},
        {"role": "user", "content": f"Document:\n{text}"}
    ]
    return call_groq_chat(messages)

# -------------------------------
# Step 6b: Summarize with Groq
# -------------------------------
def summarize_text_with_groq(text):
    prompt_system = (
        "You are a helpful assistant that summarizes Turkish business documents. "
        "Create a concise summary (max 5-7 sentences) of the document below in Turkish. "
        "Do not include emojis, filler, or repetition. Just return plain summary text."
    )
    messages = [
        {"role": "system", "content": prompt_system},
        {"role": "user", "content": text}
    ]
    client = Groq(api_key=GROQ_API_KEY)
    for attempt in range(3):
        try:
            response = client.chat.completions.create(
                model="llama3-70b-8192",
                messages=messages
            )
            content = response.choices[0].message.content.strip()
            # Remove markdown formatting if exists
            if content.startswith("```") and content.endswith("```"):
                content = '\n'.join(content.split('\n')[1:-1]).strip()
            return content
        except Exception as e:
            logging.warning(f"Groq summary attempt {attempt+1} failed: {e}")
            time.sleep(2 ** attempt)
    logging.error("Groq summary failed after 3 retries.")
    return ""


# -------------------------------
# Step 7: Critical Keywords via Groq
# -------------------------------
def get_groq_keywords(text):
    prompt_system = (
        "You are a document analysis assistant. "
        "Extract the most critical and repeated keywords from the document below. "
        "Include full dates, full telephone numbers, full bank account numbers, and company names. "
        "Return ONLY a valid JSON array of strings with no extra text or formatting."
    )
    messages = [
        {"role": "system", "content": prompt_system},
        {"role": "user", "content": text}
    ]
    if len(text) > 3000:
        chunks = chunk_text(text)
        keywords = []
        for chunk in chunks:
            keywords += call_groq_chat([
                {"role": "system", "content": prompt_system},
                {"role": "user", "content": chunk}
            ])
        return list(set(keywords))
    else:
        return call_groq_chat(messages)

# -------------------------------
# Step 8: Main Processing Function
# -------------------------------
def process_pdf(pdf_path, output_json):
    logging.info(f"Processing: {pdf_path}")
    text = extract_text_from_pdf(pdf_path)

    if not text:
        logging.warning("Empty PDF. Skipping.")
        return

    summary = summarize_text_with_groq(text)

    result = {
        "file": pdf_path,
        "summary": summary,
        "text": text,
        "yake_keywords": extract_yake_keywords(text),
        "keybert_keywords": extract_keybert_keywords(text),
        "structured_keywords": extract_structured_keywords(text),
        "stanza_entities": extract_stanza_entities(text),
        "spacy_entities": extract_spacy_entities(text),
        "combined_entities": extract_combined_entities(text),
        "groq_labels": get_groq_labels(text),            # Full text
        "groq_critical_keywords": get_groq_keywords(text)  # Full text
    }

    os.makedirs(os.path.dirname(output_json), exist_ok=True)
    with open(output_json, "w", encoding="utf-8") as f:
        json.dump(result, f, ensure_ascii=False, indent=2)

    logging.info(f"Output saved to: {output_json}")


# -------------------------------
# Entry Point
# -------------------------------
if __name__ == "__main__":
    pdf_files = [
        ("docs/pdf_doc1.pdf", "outputs/pdf_doc1_output.json"),
        ("docs/pdf_doc2.pdf", "outputs/pdf_doc2_output.json")
    ]
    with ThreadPoolExecutor(max_workers=2) as executor:
        futures = [executor.submit(process_pdf, pdf, out) for pdf, out in pdf_files]
        for future in futures:
            future.result()
