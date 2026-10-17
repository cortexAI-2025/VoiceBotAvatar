"""Isolated Gemini proof of concept. Browser handles speech recognition and playback.
Not Gemini Live; no tenant isolation or production authentication yet.
"""
import os
from typing import Literal

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from google import genai

router = APIRouter(prefix="/api/gemini", tags=["gemini-poc"])

class ChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=4000)
    language: Literal["fr", "en", "ar"] = "fr"
    system_prompt: str = Field(default="Tu es un assistant vocal professionnel, clair et concis.", max_length=2000)

class ChatResponse(BaseModel):
    reply: str

@router.post("/chat", response_model=ChatResponse)
async def chat(req: ChatRequest):
    key = os.getenv("GEMINI_API_KEY")
    if not key:
        raise HTTPException(503, "GEMINI_API_KEY is not configured")
    client = genai.Client(api_key=key)
    try:
        response = await client.aio.models.generate_content(
            model=os.getenv("GEMINI_MODEL", "gemini-2.5-flash"),
            contents=req.message,
            config={"system_instruction": req.system_prompt + f" Respond in language: {req.language}."},
        )
        return ChatResponse(reply=response.text or "Aucune réponse générée.")
    except Exception:
        # Avoid exposing provider exceptions, prompts, or credentials.
        raise HTTPException(502, "Gemini provider request failed")
    finally:
        await client.aio.aclose()
