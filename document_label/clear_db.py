import os
import chromadb
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

# ✅ Load environment variables
load_dotenv()

USER = os.getenv("POSTGRES_USER", "user")
PASSWORD = os.getenv("POSTGRES_PASSWORD", "password")
DB = os.getenv("POSTGRES_DB", "document_db")
HOST = os.getenv("POSTGRES_HOST", "localhost")
PORT = os.getenv("POSTGRES_PORT", "5432")

DATABASE_URL = f"postgresql://{USER}:{PASSWORD}@{HOST}:{PORT}/{DB}"

# ✅ Clear PostgreSQL
def clear_postgres():
    try:
        engine = create_engine(DATABASE_URL)
        with engine.connect() as conn:
            conn.execute(text("TRUNCATE document_labels RESTART IDENTITY CASCADE;"))
            conn.execute(text("TRUNCATE labels RESTART IDENTITY CASCADE;"))
            conn.execute(text("TRUNCATE documents RESTART IDENTITY CASCADE;"))
            conn.commit()
        print("✅ PostgreSQL tables cleared.")
    except Exception as e:
        print("❌ Failed to clear PostgreSQL:", e)

# ✅ Clear all data inside ChromaDB collections (keep collections)
def clear_chromadb_data():
    try:
        client = chromadb.HttpClient(host="localhost", port=8000)
        collections = client.list_collections()
        for col in collections:
            collection = client.get_collection(col.name)
            ids = collection.get()["ids"]
            if ids:
                collection.delete(ids=ids)
                print(f"✅ Cleared {len(ids)} items from collection '{col.name}'.")
            else:
                print(f"ℹ️ Collection '{col.name}' is already empty.")
    except Exception as e:
        print("❌ Failed to clear ChromaDB data:", e)

if __name__ == "__main__":
    clear_postgres()
    clear_chromadb_data()
    print("✅ All data cleared (collections preserved).")
