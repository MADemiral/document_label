from fastapi import FastAPI, HTTPException, UploadFile, File
from services.label_utils import extract_labels_and_keywords, summarize_with_groq
from doctr.io import DocumentFile
from doctr.models import ocr_predictor

app = FastAPI()

# Load OCR model once (you can choose between 'db_resnet50' or 'db_mobilenet_v3')
ocr_model = ocr_predictor(pretrained=True)

@app.post("/analyze-document")
async def analyze_document(file: UploadFile = File(...)):
    try:
        if file.content_type != "application/pdf":
            raise HTTPException(status_code=400, detail="Only PDF files are supported")

        # Read PDF bytes
        pdf_bytes = await file.read()

        # Load and parse PDF with DocTR
        doc = DocumentFile.from_pdf(pdf_bytes)
        result = ocr_model(doc)

        # Extract text from OCR result
        extracted_text = result.render().strip()
        if not extracted_text:
            raise HTTPException(status_code=422, detail="No readable text found in PDF")

        # Apply your existing NLP pipeline
        labels_keywords = extract_labels_and_keywords(extracted_text)
        summary = summarize_with_groq(extracted_text)

        return {
            "labels": labels_keywords["labels"] + labels_keywords["keywords"],
            "summary": summary
        }

    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Server error: {str(e)}")
