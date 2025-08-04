# Install requirements:
# pip install easyocr stanza groq python-dotenv

import easyocr
import stanza
from groq import Groq
from dotenv import load_dotenv
import os

# Load Groq API key from .env
load_dotenv()
GROQ_API_KEY = os.getenv("GROQ_API_KEY")

# OCR: Read image text
def ocr_from_image(image_path):
    reader = easyocr.Reader(['en', 'tr'])
    result = reader.readtext(image_path, detail=0)
    return "\n".join(result)

# Keyword Extraction using Stanza NER
def extract_keywords(text, lang='tr'):
    stanza.download(lang)
    nlp = stanza.Pipeline(lang=lang)
    doc = nlp(text)
    keywords = set()
    for sentence in doc.sentences:
        for ent in sentence.ents:
            keywords.add(ent.text)
    return list(keywords)

# Özetleme fonksiyonu
def summarize_with_groq(text):
    client = Groq(api_key=GROQ_API_KEY)
    response = client.chat.completions.create(
        model="llama3-70b-8192",
        messages=[
            {
                "role": "system",
                "content": "You are a helpful assistant that summarizes documents. Only summarize the content. Do not write anything else. Write the summary in Turkish."
            },
            {
                "role": "user",
                "content": f"Summarize the following document:\n{text}"
            }
        ]
    )
    return response.choices[0].message.content.strip()

# Etiket önerisi fonksiyonu
def suggest_labels_with_groq(text):
    client = Groq(api_key=GROQ_API_KEY)
    response = client.chat.completions.create(
        model="llama3-70b-8192",
        messages=[
            {
                "role": "system",
                "content": "You are a tagging assistant. Based on the content, suggest relevant tags/labels (3 to 7 max). Only return the labels as a list. Write the tags in Turkish."
            },
            {
                "role": "user",
                "content": f"Suggest tags for the following document:\n{text}"
            }
        ]
    )
    return response.choices[0].message.content.strip()

# Process file and save results
def process_and_save(image_path, output_txt):
    print(f"📄 Processing: {image_path}")
    text = ocr_from_image(image_path)
    keywords = extract_keywords(text)
    summary = summarize_with_groq(text)
    labels = suggest_labels_with_groq(text)

    with open(output_txt, "w", encoding="utf-8") as f:
        f.write(f"📄 FILE: {image_path}\n\n")
        f.write("📝 OCR Text:\n")
        f.write(text + "\n\n")
        f.write("🔑 Keywords (Stanza NER):\n")
        f.write(", ".join(keywords) + "\n\n")
        f.write("📚 Summary (Groq LLM):\n")
        f.write(summary + "\n\n")
        f.write("🏷️ Suggested Labels (Groq):\n")
        f.write(labels + "\n")

    print(f"✅ Results written to: {output_txt}")

# Main
if __name__ == "__main__":
    process_and_save("docs/doc1.png", "out/doc1_output_stanza_EasyOCR.txt")
    process_and_save("docs/doc2.png", "out/doc2_output_stanza_EasyOCR.txt")
    process_and_save("docs/doc3.png", "out/doc3_output_stanza_EasyOCR.txt")
