
---


# Document Labeling & Summarization Pipeline

This project automates the extraction, summarization, and tagging of document images or files using Python-based text extraction, Groq for LLM processing, and ChromaDB + PostgreSQL for storage and retrieval.

## Features

- **Text Extraction**: Uses Python libraries (e.g. `pdfplumber`, `PyMuPDF`, or `textract`) to extract raw text from documents.
- **Summarization & Tagging via Groq**: Leverages Groq's `llama3-70b-8192` model to generate Turkish summaries and suggest relevant labels.
- **Vector Search with ChromaDB**: Stores document embeddings for semantic search and retrieval.
- **Structured Storage with PostgreSQL**: Saves metadata, summaries, and labels in a relational database.

## Technologies Used

| Component        | Purpose                          |
|------------------|----------------------------------|
| Python Text Extraction | Extracts text from PDFs or other formats |
| [Groq API](https://groq.com/) | LLM-based summarization and tagging |
| [ChromaDB](https://docs.trychroma.com/) | Vector database for semantic search |
| [PostgreSQL](https://www.postgresql.org/) | Relational database for structured data |


## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/MADemiral/document_label.git
   cd document_label
   ```

2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

3. Set up your `.env` file:
   ```
   GROQ_API_KEY=your_groq_api_key_here
   POSTGRES=YOUR_POSTGRES_ENV_HERE
   ```
4. Start your services
   ```
   cd document_label
   docker-compose up -d
   ```

## Usage

To process a document and store results:

```bash
cd streamlit_app
streamlit run app.py
```

This will:
- Extract text using a Python library
- Generate a summary and labels using Groq
- Store results in PostgreSQL
- Embed and store the document in ChromaDB for semantic search



## Database Schema

The `init.sql` file sets up the following table: You can see on `document_label\init.sql`

```sql
CREATE TABLE documents (
    document_id SERIAL PRIMARY KEY,
    title TEXT,
    content TEXT,
    uploaded_at TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW(),
    summary TEXT
);
```

## Contact

For questions, suggestions, or contributions, feel free to open an issue or submit a pull request.

Perfect choice! Here's how to write the license section in your `README.md` to reflect the MIT License:

---

## 📄 License

This project is licensed under the **MIT License**.

You are free to use, modify, and distribute this software in both private and commercial applications, provided that the original copyright and license notice are included.

See the full license text in the [LICENSE](LICENSE) file.

---
