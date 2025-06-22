from fastapi import FastAPI
from pydantic import BaseModel
import requests
import fitz  # PyMuPDF
from openai import OpenAI
from dotenv import load_dotenv
import os
from fastapi.middleware.cors import CORSMiddleware # 1. IMPORT THIS

load_dotenv()
api_key = os.getenv("OPENAI_API_KEY")
client = OpenAI(api_key=api_key)

app = FastAPI()

# 2. ADD THIS ENTIRE SECTION
# This section handles the OPTIONS request from the browser
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods, including POST and OPTIONS
    allow_headers=["*"],  # Allows all headers
)
# --- END OF SECTION TO ADD ---

class QARequest(BaseModel):
    pdf_url: str
    question: str

@app.post("/ask")
def ask(req: QARequest):
    response = requests.get(req.pdf_url)
    with open("temp.pdf", "wb") as f:
        f.write(response.content)

    text = ""
    doc = fitz.open("temp.pdf")
    for page in doc:
        text += page.get_text()

    prompt = f"Transcript:\n{text[:12000]}\n\nQuestion: {req.question}"

    completion = client.chat.completions.create(
        model="gpt-4",
        messages=[{"role": "user", "content": prompt}],
        temperature=0.3,
    )

    return {"answer": completion.choices[0].message.content}