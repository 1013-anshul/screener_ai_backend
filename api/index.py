from fastapi import FastAPI
from pydantic import BaseModel
import requests
import fitz  # PyMuPDF
from openai import OpenAI
from dotenv import load_dotenv
import os
from fastapi.middleware.cors import CORSMiddleware

load_dotenv()
api_key = os.getenv("OPENAI_API_KEY")

# Add a check to ensure the API key is loaded
if not api_key:
    raise ValueError("OPENAI_API_KEY not found in environment variables.")

client = OpenAI(api_key=api_key)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class QARequest(BaseModel):
    pdf_url: str
    question: str

@app.post("/ask")
def ask(req: QARequest):
    try:
        # --- MODIFIED SECTION ---
        # 1. Download the PDF content directly into memory
        response = requests.get(req.pdf_url)
        response.raise_for_status()  # Raise an exception for bad status codes (4xx or 5xx)
        pdf_content_in_memory = response.content

        # 2. Open the PDF content directly from memory without saving a file
        doc = fitz.open(stream=pdf_content_in_memory, filetype="pdf")
        # --- END OF MODIFIED SECTION ---

        text = ""
        for page in doc:
            text += page.get_text()
        doc.close()

        # Truncate text to fit within model limits
        # OpenAI's gpt-4 has a large context, but let's be safe
        max_chars = 12000
        truncated_text = text[:max_chars]

        prompt = f"Based on the following transcript, please answer the question.\n\nTranscript:\n{truncated_text}\n\nQuestion: {req.question}"

        completion = client.chat.completions.create(
            model="gpt-4",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.3,
        )

        return {"answer": completion.choices[0].message.content}

    except requests.exceptions.RequestException as e:
        print(f"Error downloading PDF: {e}")
        return {"answer": f"Sorry, I could not download the transcript from the provided URL. Error: {e}"}
    except Exception as e:
        # This will catch any other error and report it, which is useful for debugging
        print(f"An unexpected error occurred: {e}")
        return {"answer": f"An unexpected error occurred while processing the request. Please check the server logs."}