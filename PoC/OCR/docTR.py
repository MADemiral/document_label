from doctr.io import DocumentFile
from doctr.models import ocr_predictor

# Load pretrained OCR model
model = ocr_predictor(pretrained=True)

# Load PNG image (not PDF!)
doc = DocumentFile.from_pdf("image/pdf_doc1.pdf")

# Run OCR
result = model(doc)

# Visualize result
result.show()
