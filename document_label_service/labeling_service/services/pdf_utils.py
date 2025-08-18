from typing import Optional
from doctr.io import DocumentFile
from doctr.models import ocr_predictor
def extract_text_from_pdf(file_bytes: bytes, max_pages: Optional[int] = None) -> str:
    # Load OCR model
    model = ocr_predictor(pretrained=True)

    # Load PDF from bytes
    doc = DocumentFile.from_pdf(file_bytes)

    # Limit pages if needed
    if max_pages is not None:
        doc.pages = doc.pages[:max_pages]

    # Run OCR
    result = model(doc) 

    # Extract text from OCR result
    extracted_text = []
    for page in result.pages:
        page_text = ""
        for block in page.blocks:
            for line in block.lines:
                line_text = " ".join([word.value for word in line.words])
                page_text += line_text + " "
        if page_text.strip():
            extracted_text.append(page_text.strip())

    return "\n\n".join(extracted_text).strip()