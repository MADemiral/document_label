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

    # 1️⃣ Call analyze-document
    analyze_url = f"{BASE_URL}/analyze-document"
    payload = {"content": text}
    analyze_response = requests.post(analyze_url, json=payload)
    print("Analyze Status:", analyze_response.status_code)

    parsed = analyze_response.json()
    labels = parsed.get("labels", [])
    summary = parsed.get("summary", "")

    print("\n--- Extracted Labels ---")
    print(json.dumps(labels, ensure_ascii=False, indent=2))
    print("\n--- Extracted Summary ---")
    print(summary)

    """# 2️⃣ Simulate user confirming document
    confirm_url = f"{BASE_URL}/confirm-document"
    confirm_payload = {
        "content": text,
        "summary": summary,
        "labels": labels
    }
    confirm_response = requests.post(confirm_url, json=confirm_payload)

    print("\nConfirm Status:", confirm_response.status_code)
    print("Confirm Response:", confirm_response.text)

    # 3️⃣ Perform semantic search
    search_url = f"{BASE_URL}/search"
    search_payload = {"query": "freelance metin yazarı fatura"}
    search_response = requests.post(search_url, json=search_payload)

    print("\nSearch Status:", search_response.status_code)
    try:
        results = search_response.json()
        print("\n--- Semantic Search Results ---")
        print(json.dumps(results, ensure_ascii=False, indent=2))
    except Exception as e:
        print("Failed to parse search response:", e)"""

if __name__ == "__main__":
    pdf_files = ["doc/pdf_doc1.pdf", "doc/pdf_doc2.pdf", "doc/pdf_doc3.pdf"]
    for pdf in pdf_files:
        if os.path.exists(pdf):
            process_pdf(pdf)
        else:
            print(f"File not found: {pdf}")
