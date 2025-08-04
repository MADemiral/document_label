from fastapi import FastAPI, Request, HTTPException
import httpx
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

app.add.middleware(
    CORSMiddleware,
    allow_originsg=["*"],
    allow_methods=["*"],
    allow_headers=["*"]
)

LABELING_URL = "http://labeling_service:1071"
EMBEDDING_URL = "http://embedding_service:1071"

async def forward_request(request: Request, target_url: str):
    async with httpx.AsyncClient() as client:
        try:
            body = await request.json()
            response = await client.post(target_url, json=body)
            return response.json()
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))
        
@app.post("/analyze-document")
async def analyze_document(request: Request):
    return await forward_request(request=request, target_url=f"{LABELING_URL}/analyze-document")

@app.post("/confirm-document")
async def analyze_document(request: Request):
    return await forward_request(request=request, target_url=f"{EMBEDDING_URL}/confirm-document")

@app.post("/search")
async def analyze_document(request: Request):
    return await forward_request(request=request, target_url=f"{EMBEDDING_URL}/search")

