import os
import json
import time
import logging
from dotenv import load_dotenv
from groq import Groq

load_dotenv()
logging.basicConfig(level=logging.INFO)

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
if not GROQ_API_KEY:
    logging.error("GROQ_API_KEY missing in .env")
    exit(1)

client = Groq(api_key=GROQ_API_KEY)

# --- Helpers ---
def safe_json_extract(text: str):
    """Extract JSON array from text safely."""
    text = text.strip()
    if text.startswith("```"):
        text = "\n".join(text.split("\n")[1:-1]).strip()
    start = text.find("[")
    end = text.rfind("]") + 1
    if start == -1 or end == -1:
        return []
    try:
        return json.loads(text[start:end])
    except:
        logging.warning("Failed to parse JSON response.")
        return []

def call_groq(messages, retries=3, delay=1):
    for attempt in range(retries):
        try:
            response = client.chat.completions.create(
                model="llama3-70b-8192",
                messages=messages
            )
            return response.choices[0].message.content.strip()
        except Exception as e:
            logging.warning(f"Groq attempt {attempt+1} failed: {e}")
            time.sleep(delay * (2 ** attempt))
    return ""

def chunk_text(text, max_len=3000):
    return [text[i:i+max_len] for i in range(0, len(text), max_len)]

# --- Combined Labels + Keywords ---
def extract_labels_and_keywords(content: str):
    label_prompt = (
        "You're a professional Turkish tagging assistant. "
        "Given the document below, extract 3–7 relevant topic tags. "
        "Return only a JSON array of strings. Use concise Turkish tags, no extra text."
    )

    keyword_prompt = (
        "You are a document analysis assistant. "
        "Extract the most critical and repeated keywords from the document below. "
        "Include full dates, full telephone numbers, full bank account numbers, and company names. "
        "Return ONLY a valid JSON array of strings with no extra text or formatting."
    )

    # Labels
    raw_labels = call_groq([
        {"role": "system", "content": label_prompt},
        {"role": "user", "content": content}
    ])
    labels = safe_json_extract(raw_labels)

    # Keywords with chunking
    keywords = []
    if len(content) > 3000:
        for chunk in chunk_text(content):
            raw_kw = call_groq([
                {"role": "system", "content": keyword_prompt},
                {"role": "user", "content": chunk}
            ])
            keywords += safe_json_extract(raw_kw)
        keywords = list(set(keywords))
    else:
        raw_kw = call_groq([
            {"role": "system", "content": keyword_prompt},
            {"role": "user", "content": content}
        ])
        keywords = safe_json_extract(raw_kw)

    return {"labels": labels, "keywords": keywords}

# --- Summary ---
def summarize_with_groq(content: str):
    summary_prompt = (
        "You are a helpful assistant that summarizes Turkish business documents. "
        "Create a concise summary (max 5-7 sentences) of the document below in Turkish. "
        "Do not include emojis, filler, or repetition. Just return plain summary text."
    )
    raw_summary = call_groq([
        {"role": "system", "content": summary_prompt},
        {"role": "user", "content": content}
    ])
    return raw_summary.strip()