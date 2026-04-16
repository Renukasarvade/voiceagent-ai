import os
import re
import json
import requests
from pathlib import Path
from dotenv import load_dotenv
from groq import Groq
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse
from pydantic import BaseModel

load_dotenv()

app = FastAPI(title="VoiceAgent API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Constants ──────────────────────────────────────────────
GROQ_API_KEY       = os.getenv("GROQ_API_KEY", "")
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY", "")
OUTPUT_DIR         = Path(__file__).parent / "output"
OUTPUT_DIR.mkdir(exist_ok=True)

VALID_INTENTS        = {"write_code", "create_file", "summarize", "chat"}
CONFIDENCE_THRESHOLD = 0.6

groq_client = Groq(api_key=GROQ_API_KEY) if GROQ_API_KEY else None


# ── Pydantic Models ────────────────────────────────────────
class IntentRequest(BaseModel):
    text: str

class ExecuteRequest(BaseModel):
    text: str
    intent: str
    params: dict = {}
    confirmed: bool = True
    regenerate: bool = False


# ── Helpers ────────────────────────────────────────────────
def safe_filename(name: str) -> str:
    return os.path.basename(name.replace("..", "").strip()) or "output.txt"

def clean_code(raw: str) -> str:
    """Strip markdown fences and return only executable code."""
    raw = re.sub(r"^```[\w]*\n?", "", raw.strip())
    raw = re.sub(r"\n?```$", "", raw.strip())
    if "```" in raw:
        raw = raw.split("```")[0].strip()
    # Collapse 3+ blank lines to 1
    raw = re.sub(r'\n{3,}', '\n\n', raw)
    return raw.strip()

def detect_language(text: str) -> str:
    text = text.lower()
    for lang, pattern in [
        ("python",     r"\bpython\b"),
        ("javascript", r"\bjavascript\b|\bjs\b"),
        ("typescript", r"\btypescript\b|\bts\b"),
        ("java",       r"\bjava\b"),
        ("go",         r"\bgolang\b|\bgo lang\b"),
        ("rust",       r"\brust\b"),
        ("bash",       r"\bbash\b|\bshell\b"),
        ("sql",        r"\bsql\b"),
        ("html",       r"\bhtml\b"),
        ("css",        r"\bcss\b"),
        ("c",          r"\bc language\b|\bin c\b|\bc program\b"),
        ("c++",        r"\bc\+\+\b|\bcpp\b"),
    ]:
        if re.search(pattern, text):
            return lang
    return "python"

def infer_filename(text: str, lang: str) -> str:
    ext_map = {
        "python": "py", "javascript": "js", "typescript": "ts",
        "java": "java", "go": "go", "rust": "rs", "bash": "sh",
        "sql": "sql", "html": "html", "css": "css", "c++": "cpp",
        "c": "c",
    }
    ext = ext_map.get(lang, "py")
    m = re.search(r'[\w\-]+\.' + ext, text)
    if m:
        return m.group(0)
    stopwords = {"a","an","the","to","for","and","or","write","create","make",
                 "code","file","script","function","generate","python","javascript",
                 "program","in","using","with","that","this"}
    words = [w for w in re.findall(r'[a-z]+', text.lower()) if w not in stopwords]
    return ("_".join(words[:3]) or "output") + "." + ext

def normalize_intent(data: dict) -> dict:
    """Strict single-intent normalization with fallback to chat."""
    raw_intent = data.get("intent") or data.get("primary_intent") or "chat"

    if isinstance(raw_intent, list):
        raw_intent = raw_intent[0] if raw_intent else "chat"

    intent = str(raw_intent).strip().lower()
    confidence = float(data.get("confidence", 0.0))
    params = data.get("params", {})
    fallback = data.get("fallback", False)

    if intent not in VALID_INTENTS:
        intent = "chat"
        fallback = True

    if confidence < CONFIDENCE_THRESHOLD:
        intent = "chat"
        fallback = True

    return {
        "intent":     intent,
        "confidence": confidence,
        "params":     params,
        "fallback":   fallback,
    }


# ── Route 1: Health ────────────────────────────────────────
@app.get("/health")
def health():
    return {
        "status":     "ok",
        "groq":       bool(GROQ_API_KEY),
        "openrouter": bool(OPENROUTER_API_KEY),
    }


# ── Route 2: Transcribe Audio ──────────────────────────────
@app.post("/transcribe")
async def transcribe(file: UploadFile = File(...)):
    if not groq_client:
        raise HTTPException(400, "GROQ_API_KEY not set")

    audio_bytes = await file.read()
    if not audio_bytes:
        raise HTTPException(400, "Empty audio file received")

    # Determine extension — default webm for browser MediaRecorder blobs
    raw_name = file.filename or "recording.webm"
    ext = raw_name.rsplit(".", 1)[-1].lower() if "." in raw_name else "webm"

    mime_map = {
        "wav":  "audio/wav",
        "mp3":  "audio/mpeg",
        "m4a":  "audio/mp4",
        "ogg":  "audio/ogg",
        "flac": "audio/flac",
        "webm": "audio/webm",
    }
    mime = mime_map.get(ext, "audio/webm")

    # Ensure filename has a proper extension for Groq
    safe_name = f"recording.{ext}"

    try:
        result = groq_client.audio.transcriptions.create(
            file=(safe_name, audio_bytes, mime),
            model="whisper-large-v3",
            response_format="verbose_json",
        )
        text = result.text.strip() if result.text else ""
        if not text:
            raise HTTPException(422, "Transcription returned empty text. Please speak clearly and try again.")
        return {
            "text":     text,
            "language": getattr(result, "language", "en"),
            "duration": round(getattr(result, "duration", 0), 1),
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, f"Transcription failed: {str(e)}")


# ── Route 3: Classify Intent ───────────────────────────────
@app.post("/intent")
def classify_intent(req: IntentRequest):
    if not groq_client:
        return normalize_intent(_fallback_intent(req.text))

    # Fast-path: explicit summarize prefix
    if re.match(r'^[Ss]ummarize\s*[:\-]', req.text.strip()):
        return normalize_intent({
            "intent":     "summarize",
            "confidence": 0.95,
            "params":     {"filename": None, "language": None, "description": req.text[:100]},
            "fallback":   False,
        })

    system = """You are an intent classifier for a voice AI agent.
Analyze the user's text and classify it into EXACTLY ONE intent.

Valid intents (pick ONLY one):
- write_code  : user wants code written or generated
- create_file : user wants to create/touch a file or folder (no code content)
- summarize   : user wants text summarized
- chat        : general question or conversation

IMPORTANT RULES:
- If the user says "create a file X and write Y in it" → use write_code (because code content is requested)
- If the user says "create a file X" with no code request → use create_file
- Return ONLY one intent string — never a list, never two values.
- If unsure, default to "chat".
- Return ONLY a raw JSON object — no markdown fences, no explanation, no extra text before or after.

Example output:
{
  "intent": "write_code",
  "confidence": 0.92,
  "params": {
    "filename": null,
    "language": "python",
    "description": "short description"
  }
}"""

    try:
        resp = groq_client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[
                {"role": "system", "content": system},
                {"role": "user",   "content": req.text},
            ],
            max_tokens=300,
            temperature=0.0,
        )

        if not resp.choices:
            return normalize_intent(_fallback_intent(req.text))

        raw = resp.choices[0].message.content.strip()

        # ── FIX: Robustly extract JSON even if model adds surrounding text ──
        raw = re.sub(r'```(?:json)?', '', raw).strip()
        raw = raw.replace('```', '').strip()

        # Extract just the JSON object using regex
        json_match = re.search(r'\{.*\}', raw, re.DOTALL)
        if not json_match:
            return normalize_intent(_fallback_intent(req.text))

        data = json.loads(json_match.group(0))
        data["fallback"] = False
        return normalize_intent(data)

    except Exception:
        return normalize_intent(_fallback_intent(req.text))


def _fallback_intent(text: str) -> dict:
    t = text.lower()
    if re.match(r'^summarize\s*[:\-]', t) or any(k in t for k in ["summarize", "summary", "tldr", "shorten"]):
        intent = "summarize"
    elif any(k in t for k in ["write", "code", "function", "script", "generate", "implement", "program"]):
        intent = "write_code"
    elif any(k in t for k in ["create", "make", "new file", "touch", "folder"]):
        # ── FIX: if create_file also mentions code/program keywords → write_code ──
        code_keywords = ["write", "program", "code", "function", "script", "implement",
                         "hello", "world", "print", "fibonacci", "factorial", "sort"]
        if any(k in t for k in code_keywords):
            intent = "write_code"
        else:
            intent = "create_file"
    else:
        intent = "chat"

    lang = detect_language(text)
    m = re.search(r'[\w\-]+\.\w{1,5}', text)
    return {
        "intent":     intent,
        "confidence": 0.75,
        "params": {
            "filename":    m.group(0) if m else None,
            "language":    lang,
            "description": text[:200],
        },
        "fallback": True,
    }


# ── Route 4: Execute Action ────────────────────────────────
@app.post("/execute")
def execute(req: ExecuteRequest):
    intent = req.intent if req.intent in VALID_INTENTS else "chat"
    params = req.params
    text   = req.text
    regen  = req.regenerate

    if intent == "create_file":
        return _create_file(params, text)
    elif intent == "write_code":
        return _write_code(params, text, regen)
    elif intent == "summarize":
        return _summarize(params, text, regen)
    else:
        return _chat(text, regen)


def _create_file(params: dict, text: str) -> dict:
    filename = safe_filename(params.get("filename") or "new_file.txt")
    filepath = OUTPUT_DIR / filename

    # ── FIX: If user wants code written into the file, delegate to write_code ──
    code_keywords = ["write", "program", "code", "function", "script", "implement",
                     "hello", "world", "print", "fibonacci", "factorial", "sort",
                     "algorithm", "class", "method", "loop"]
    if any(k in text.lower() for k in code_keywords):
        lang = detect_language(text)
        params["language"] = lang
        params["filename"] = filename
        return _write_code(params, text)

    try:
        filepath.touch()
        return {
            "action":   "create_file",
            "output":   f"✅ File created: output/{filename}",
            "filename": filename,
            "error":    None,
        }
    except Exception as e:
        return {"action": "create_file", "output": "", "filename": None, "error": str(e)}


def _write_code(params: dict, text: str, regenerate: bool = False) -> dict:
    lang     = params.get("language") or detect_language(text)
    filename = safe_filename(params.get("filename") or infer_filename(text, lang))
    filepath = OUTPUT_DIR / filename

    if OPENROUTER_API_KEY:
        code = _generate_code_openrouter(text, lang, regenerate)
        if code.get("error") and groq_client:
            code = _generate_code_groq(text, lang, regenerate)
    else:
        code = _generate_code_groq(text, lang, regenerate)

    if code.get("error"):
        return {"action": "write_code", "output": "", "code": "", "filename": None, "error": code["error"]}

    clean = clean_code(code["code"])
    if not clean:
        return {"action": "write_code", "output": "", "code": "", "filename": None, "error": "Generated code was empty after cleaning."}

    try:
        filepath.write_text(clean, encoding="utf-8")
        return {
            "action":   "write_code",
            "output":   f"✅ Code saved: output/{filename}",
            "filename": filename,
            "code":     clean,
            "language": lang,
            "error":    None,
        }
    except Exception as e:
        return {"action": "write_code", "output": "", "code": clean, "filename": None, "error": str(e)}


def _generate_code_openrouter(text: str, lang: str, regenerate: bool) -> dict:
    try:
        sys_prompt = (
            f"You are an expert {lang} developer. "
            "Return ONLY clean, working, complete code. "
            "No explanations. No markdown fences. "
            "Only the complete, runnable code."
        )
        if regenerate:
            sys_prompt += " Generate a clean alternative implementation if possible."

        resp = requests.post(
            "https://openrouter.ai/api/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {OPENROUTER_API_KEY}",
                "Content-Type":  "application/json",
            },
            json={
                "model":    "deepseek/deepseek-coder-v2-lite-instruct",
                "messages": [
                    {"role": "system", "content": sys_prompt},
                    {"role": "user",   "content": text},
                ],
                "max_tokens":  2000,
                "temperature": 0.5 if regenerate else 0.0,
            },
            timeout=30,
        )
        data = resp.json()

        if "error" in data:
            return {"code": "", "error": f"OpenRouter error: {data['error'].get('message', str(data['error']))}"}

        if "choices" not in data or not data["choices"]:
            return {"code": "", "error": "OpenRouter: no choices in response."}

        raw = data["choices"][0]["message"]["content"].strip()
        return {"code": clean_code(raw), "error": None}

    except requests.exceptions.Timeout:
        return {"code": "", "error": "OpenRouter request timed out."}
    except Exception as e:
        return {"code": "", "error": str(e)}


def _generate_code_groq(text: str, lang: str, regenerate: bool) -> dict:
    if not groq_client:
        return {"code": "", "error": "No API key available"}
    try:
        sys_prompt = (
            f"You are an expert {lang} developer. "
            "Return ONLY clean, working, complete code. "
            "No explanations. No markdown fences. "
            "Only the complete, runnable code."
        )
        if regenerate:
            sys_prompt += " Generate a clean alternative implementation if possible."

        resp = groq_client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[
                {"role": "system", "content": sys_prompt},
                {"role": "user",   "content": text},
            ],
            max_tokens=2000,
            temperature=0.5 if regenerate else 0.0,
        )

        if not resp.choices:
            return {"code": "", "error": "Groq returned no choices."}

        raw = resp.choices[0].message.content.strip()
        return {"code": clean_code(raw), "error": None}

    except Exception as e:
        return {"code": "", "error": str(e)}


def _summarize(params: dict, text: str, regenerate: bool = False) -> dict:
    clean_text = re.sub(r'^[Ss]ummarize\s*[:\-]?\s*', '', text).strip()

    if not clean_text:
        return {"action": "summarize", "output": "❌ No text provided to summarize.", "error": None}

    if clean_text:
        non_printable = sum(
            1 for c in clean_text[:500]
            if ord(c) > 127 or (ord(c) < 32 and c not in '\n\r\t')
        )
        if non_printable / min(len(clean_text), 500) > 0.3:
            return {
                "action": "summarize",
                "output": "❌ Cannot summarize binary or PDF content. Please paste plain text.",
                "error":  None,
            }

    if not groq_client:
        sentences = clean_text.split(". ")[:3]
        return {"action": "summarize", "output": ". ".join(sentences), "error": None}

    try:
        sys_prompt = (
            "Summarize the following text clearly and concisely in under 150 words. "
            "Use bullet points if helpful. "
            "Do NOT include any preamble like 'Here is a summary'."
        )
        if regenerate:
            sys_prompt += " Provide a slightly improved or alternative version of the summary."

        resp = groq_client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[
                {"role": "system", "content": sys_prompt},
                {"role": "user",   "content": clean_text},
            ],
            max_tokens=400,
            temperature=0.5 if regenerate else 0.0,
        )

        if not resp.choices:
            return {"action": "summarize", "output": "❌ No response from model.", "error": None}

        return {
            "action": "summarize",
            "output": resp.choices[0].message.content.strip(),
            "error":  None,
        }
    except Exception as e:
        return {"action": "summarize", "output": "", "error": str(e)}


def _chat(text: str, regenerate: bool = False) -> dict:
    if not groq_client:
        return {"action": "chat", "output": "Please set GROQ_API_KEY to enable chat.", "error": None}

    try:
        sys_prompt = "You are a helpful AI assistant. Answer in under 80 words, clear and concise. No filler phrases."
        if regenerate:
            sys_prompt += " Provide a slightly improved or alternative version of the answer."

        resp = groq_client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[
                {"role": "system", "content": sys_prompt},
                {"role": "user",   "content": text},
            ],
            max_tokens=400,
            temperature=0.5 if regenerate else 0.0,
        )

        if not resp.choices:
            return {"action": "chat", "output": "❌ No response from model.", "error": None}

        return {
            "action": "chat",
            "output": resp.choices[0].message.content.strip(),
            "error":  None,
        }
    except Exception as e:
        return {"action": "chat", "output": "", "error": str(e)}


# ── Route 5: List output files ─────────────────────────────
@app.get("/files")
def list_files():
    files = []
    for f in sorted(OUTPUT_DIR.iterdir()):
        if f.name.startswith("."):
            continue
        files.append({
            "name": f.name,
            "size": f.stat().st_size,
        })
    return {"files": files}


# ── Route 6: Download output file ─────────────────────────
@app.get("/files/download/{filename}")
def download_file(filename: str):
    safe = safe_filename(filename)
    filepath = OUTPUT_DIR / safe
    if not filepath.exists():
        raise HTTPException(404, f"File not found: {safe}")
    return FileResponse(
        path=str(filepath),
        filename=safe,
        media_type="application/octet-stream",
    )


# ── Route 7: Delete output file ───────────────────────────
@app.delete("/files/{filename}")
def delete_file(filename: str):
    safe = safe_filename(filename)
    filepath = OUTPUT_DIR / safe
    if not filepath.exists():
        raise HTTPException(status_code=404, detail="File not found")
    try:
        filepath.unlink()
        return {"message": f"Deleted {safe}"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── Static frontend ────────────────────────────────────────
from fastapi.staticfiles import StaticFiles

BASE_DIR = Path(__file__).parent

dist_path = BASE_DIR / "dist"
if dist_path.exists():
    app.mount("/static/assets", StaticFiles(directory=dist_path / "assets"), name="static")

    @app.get("/")
    def serve_frontend():
        return FileResponse(str(dist_path / "index.html"))
else:
    @app.get("/")
    def serve_root():
        return {"message": "VoiceAgent API is running. Frontend not built yet."}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)