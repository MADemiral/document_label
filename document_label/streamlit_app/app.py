import streamlit as st
import pdfplumber
import docx
from gateway_api import analyze_document, confirm_document, semantic_search

st.set_page_config(page_title="Document Labeling UI", layout="wide")

text = ""

def extract_text_from_pdf(file):
    with pdfplumber.open(file) as pdf:
        text = "\n".join(page.extract_text() for page in pdf.pages if page.extract_text())
        return text.strip()
    
def extract_text_from_docx(file):
    doc = docx.Document(file)
    return "\n".join(p.text for p in doc.paragraphs).strip()

st.title("Document Labeling Gatewat UI")
tab1, tab2 = st.tabs(["Analyze & Confirm", "Search"])

with tab1:
    st.subheader("Upload PDF or DOCX file"),
    uploaded_file = st.file_uploader("Upload your file", type=["pdf","docx"])

    if uploaded_file:
        file_type = uploaded_file.name.split(".")[-1].lower()
        if file_type == "pdf":
            text = extract_text_from_pdf(uploaded_file)
        elif file_type == "docx":
            text = extract_text_from_docx(uploaded_file)
        else: 
            st.error("Unsupported file type")
    
    if text and st.button("Analyze"):
        with st.spinner("Analyzing..."):
            result = analyze_document(text)
            st.session_state["labels"] = result.get("labels", [])
            st.session_state["summary"] = result.get("summary", "")
            st.session_state["text"] = text
            st.session_state["analysis_done"] = True
    
    if st.session_state.get("analysis_done", False):
        st.success("Analysis Complete")
        st.text_area("Summary", st.session_state["summary"], key="summary", height=100)

        st.markdown("Edit Labels")
        cols = st.columns(4)
        updated_labels = []
        for i, label in enumerate(st.session_state["labels"]):
            with cols[i%4]:
                if st.button(f"{label}", key=f"remove_{i}"):
                    continue
                updated_labels.append(label)
        st.session_state["labels"] = updated_labels

        new_label = st.text_input("Add new label", key="add_label_input")
        if st.button("Add Label"):
            if new_label and new_label not in st.session_state["labels"]:
                st.session_state["labels"].append(new_label.strip())
        
        st.markdown("Final Labels")
        st.write(st.session_state["labels"])

        if st.button("Confirm Document"):
            response = confirm_document(
                content=st.session_state["content"],
                summary=st.session_state["summary"],
                labels=st.session_state["labels"]
            )
            st.success("Document saved")
            st.session_state["analysis_done"] = False

