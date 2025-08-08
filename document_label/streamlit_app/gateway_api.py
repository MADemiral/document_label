import requests

GATEWAY_URL = "http://localhost:1071"

def analyze_document(content:str):
    response = requests.post(f"{GATEWAY_URL}/analyze-document", json=content)
    return response.json()

def confirm_document(content:str, summary:str, labels: list[str]):
    payload = {
        "content": content,
        "summary": summary,
        "labels": labels
    }
    return requests.post(f"{GATEWAY_URL}/confirm-document", json= payload).json()

def semantic_search(query: str):
    return requests.post(f"{GATEWAY_URL}/search", json= {"query": query}).json()
