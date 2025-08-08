import streamlit as st
import tempfile
import docx
from gateway_api import analyze_document, confirm_document, semantic_search

# docTR imports
from doctr.io import DocumentFile
from doctr.models import ocr_predictor

st.set_page_config(page_title="Document Labeling UI", layout="wide")

# Initialize session state
for key, default in {
    "text": "",
    "summary": "",
    "labels": [],
    "analysis_done": False
}.items():
    if key not in st.session_state:
        st.session_state[key] = default

# PDF → text via docTR
def extract_text_from_pdf(uploaded_file):
    with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as tmp:
        tmp.write(uploaded_file.read())
        tmp.flush()
        doc = DocumentFile.from_pdf(tmp.name)

    model = ocr_predictor(pretrained=True)
    result = model(doc)

    pages = []
    for page in result.pages:
        lines = []
        for block in page.blocks:
            for line in block.lines:
                words = [w.value for w in line.words]
                lines.append(" ".join(words))
        pages.append("\n".join(lines))

    return "\n\n".join(pages).strip()

# DOCX → text
def extract_text_from_docx(uploaded_file):
    doc = docx.Document(uploaded_file)
    return "\n".join(p.text for p in doc.paragraphs).strip()

# ---- UI Layout ----
st.title("Document Labeling Gateway UI")
tab1, tab2 = st.tabs(["Analyze & Confirm", "Semantic Search"])

# --- Tab 1: Analyze & Confirm ---
with tab1:
    st.subheader("Upload PDF or DOCX file for OCR and Analysis")
    uploaded_file = st.file_uploader("Choose a file", type=["pdf", "docx"])

    if uploaded_file:
        ext = uploaded_file.name.rsplit(".", 1)[-1].lower()
        with st.spinner("Performing OCR..."):
            if ext == "pdf":
                st.session_state["text"] = extract_text_from_pdf(uploaded_file)
            elif ext == "docx":
                st.session_state["text"] = extract_text_from_docx(uploaded_file)
            else:
                st.error("Unsupported file type")

        if st.session_state["text"]:
            st.markdown("#### Extracted Text Preview")
            st.text_area("Preview", st.session_state["text"], height=200)

    if st.session_state["text"] and st.button("Analyze"):
        with st.spinner("Analyzing document..."):
            result = analyze_document(st.session_state["text"])
            st.session_state["labels"] = result.get("labels", [])
            st.session_state["summary"] = result.get("summary", "")
            st.session_state["analysis_done"] = True

    if st.session_state["analysis_done"]:
        st.success("Analysis complete")
        st.text_area("Summary", st.session_state["summary"], key="summary", height=100)

        st.markdown("#### Edit Labels")
        edited = st.multiselect(
            "Current Labels",
            options=st.session_state["labels"],
            default=st.session_state["labels"]
        )
        st.session_state["labels"] = edited

        new_label = st.text_input("Add a new label", key="new_label_input")
        if st.button("Add Label"):
            label = new_label.strip()
            if label and label not in st.session_state["labels"]:
                st.session_state["labels"].append(label)
                st.experimental_rerun()

        st.markdown("#### Final Labels")
        st.write(st.session_state["labels"])

        if st.button("Confirm Document"):
            response = confirm_document(
                content=st.session_state["text"],
                summary=st.session_state["summary"],
                labels=st.session_state["labels"]
            )
            if response.get("status") == "error":
                st.error("Failed to save document.")
            else:
                st.success("Document saved successfully.")
                # reset for next document
                for k in ("analysis_done", "text", "summary", "labels"):
                    st.session_state[k] = False if k == "analysis_done" else ""

# --- Tab 2: Semantic Search ---
with tab2:
    st.subheader("Search Documents Semantically")
    query = st.text_input("Enter your search query")

    if st.button("Search"):
        if not query.strip():
            st.warning("Please enter a query.")
        else:
            with st.spinner("Searching..."):
                results = semantic_search(query)

            if not results:
                st.info("No results found.")
            else:
                st.markdown("#### Search Results")
                for doc in results:
                    st.markdown(f"**Title:** {doc.get('title', 'Untitled')}")
                    st.markdown(f"**Summary:** {doc.get('summary', '')}")
                    st.markdown(f"**Labels:** {', '.join(doc.get('labels', []))}")
                    st.markdown("---")
