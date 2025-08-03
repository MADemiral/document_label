import requests
import json
import os
import pdfplumber

BASE_URL = "http://localhost:1071"

def extract_text_from_pdf(pdf_path):
    text = ""
    with pdfplumber.open(pdf_path) as pdf:
        for page in pdf.pages:
            page_text = page.extract_text()
            if page_text:
                text += page_text + "\n"
    return text.strip()

def process_pdf(pdf_path):
    print(f"\n=== Processing {pdf_path} ===")
    text = extract_text_from_pdf(pdf_path)
    if not text:
        print("PDF is empty or failed to read.")
        return

    url = f"{BASE_URL}/analyze-document"
    payload = {"content": text}
    response = requests.post(url, json=payload)

    print("Status:", response.status_code)
    print("Raw Response:", response.text)
    try:
        parsed = response.json()
        print("\n--- Labels ---")
        print(json.dumps(parsed.get("labels", []), ensure_ascii=False, indent=2))
        print("\n--- Keywords ---")
        print(json.dumps(parsed.get("keywords", []), ensure_ascii=False, indent=2))
        print("\n--- Summary ---")
        print(parsed.get("summary", ""))
    except Exception as e:
        print("Failed to parse JSON:", e)

if __name__ == "__main__":
    pdf_files = ["doc/pdf_doc1.pdf", "doc/pdf_doc2.pdf"]
    for pdf in pdf_files:
        if os.path.exists(pdf):
            process_pdf(pdf)
        else:
            print(f"File not found: {pdf}")
