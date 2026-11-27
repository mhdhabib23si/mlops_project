from fastapi import FastAPI, File, UploadFile, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from pydantic import BaseModel
from typing import List, Optional
import pandas as pd
import io
import hashlib
import logging
import os
import re
import asyncio
import json
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen
from preprocessing import TextPreprocessor, validate_dataframe, clean_dataframe
from sentiment_model import sentiment_analyzer
from category_model import category_classifier
from facial_expression_model import facial_expression_analyzer
from storage import get_comments as load_comments
from storage import get_dashboard_stats, initialize_database, store_import

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize preprocessor
preprocessor = TextPreprocessor()

@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Lifespan context manager to load ML models on startup
    """
    initialize_database()
    logger.info("Loading ML models...")
    try:
        # Load sentiment analyzer (IndoBERT)
        logger.info("Loading IndoBERT model for sentiment analysis...")
        sentiment_analyzer.load_model()
        logger.info("IndoBERT model loaded successfully")

        # Load category classifier (LLaMA 3)
        logger.info("Loading LLaMA 3 model for category classification...")
        category_classifier.load_model()
        logger.info("LLaMA 3 model loaded successfully")

        logger.info("All ML models loaded successfully")
    except Exception as e:
        logger.warning(f"Error loading ML models: {e}")
        logger.warning("Using rule-based fallback for predictions")

    yield

    # Cleanup on shutdown
    logger.info("Shutting down...")

app = FastAPI(
    title="Feedback Analytics API",
    description="API untuk analisis umpan balik mahasiswa PCR dengan IndoBERT dan LLaMA 3",
    version="1.0.0",
    lifespan=lifespan
)

# CORS configuration
cors_origins = [
    origin.strip()
    for origin in os.getenv(
        'CORS_ORIGINS',
        'http://localhost:5173,http://127.0.0.1:5173,http://localhost:8080,http://127.0.0.1:8080',
    ).split(',')
    if origin.strip()
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pydantic models
class CommentRequest(BaseModel):
    text: str

class CommentResponse(BaseModel):
    text: str
    sentiment: str
    category: str
    confidence: Optional[float] = None

class BatchCommentResponse(CommentResponse):
    id: int
    year: int
    original_category: Optional[str] = None
    label_source: str = "model"
    source_label_confidence: Optional[str] = None
    source_label_method: Optional[str] = None
    verification_status: Optional[str] = None

class BatchResponse(BaseModel):
    total: int
    processed: int
    results: List[BatchCommentResponse]
    status: str
    message: Optional[str] = None

class ChatRequest(BaseModel):
    message: str
    session_id: Optional[str] = None

class ChatResponse(BaseModel):
    message: str
    sentiment: str
    category: str
    confidence: float
    summary_card: Optional[dict] = None
    sources: Optional[List[str]] = None

class WebsiteStats(BaseModel):
    total_comments: int
    total_positif: int
    total_netral: int
    total_negatif: int
    available_years: List[int]
    yearly_totals: dict
    yearly_sentiment: dict
    category_stats: List[dict]


def _header_key(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", "", str(value).strip().casefold())


def _normalize_dataset_columns(dataframe: pd.DataFrame) -> pd.DataFrame:
    aliases = {
        "Komentar": {"komentar", "comment", "text"},
        "Tahun": {"tahun", "year"},
        "Kategori Layanan": {"kategorilayanan", "kategori", "kategori asli"},
        "Label Sentimen": {"labelsentimen", "sentimen", "sentiment"},
        "Keyakinan Label": {"keyakinanlabel"},
        "Metode Label": {"metodelabel"},
        "Status Verifikasi": {"statusverifikasi"},
    }
    normalized_aliases = {
        canonical: {_header_key(alias) for alias in names | {canonical}}
        for canonical, names in aliases.items()
    }
    renames = {}
    for canonical, names in normalized_aliases.items():
        matching = [column for column in dataframe.columns if _header_key(column) in names]
        if len(matching) > 1:
            raise HTTPException(
                status_code=400,
                detail=f"Kolom untuk '{canonical}' ditemukan lebih dari sekali.",
            )
        if matching and matching[0] != canonical:
            renames[matching[0]] = canonical
    return dataframe.rename(columns=renames)


def _normalize_sentiment_label(value) -> Optional[str]:
    if pd.isna(value):
        return None
    return {
        "positif": "Positif",
        "positive": "Positif",
        "netral": "Netral",
        "neutral": "Netral",
        "negatif": "Negatif",
        "negative": "Negatif",
    }.get(_header_key(value))


SERVICE_CATEGORY_ALIASES = {
    "kemahasiswaan": "Kemahasiswaan",
    "keuangan": "Keuangan",
    "sistemdanteknologiinformasi": "Sistem & TI",
    "sistemti": "Sistem & TI",
    "perpustakaan": "Perpustakaan",
    "kerjasamaindustridanpusatkarir": "Kerjasama & Karir",
    "kerjasamakarir": "Kerjasama & Karir",
    "baak": "BAAK",
    "saranadanprasarana": "Sarana & Prasarana",
}


def _normalize_service_category(value) -> Optional[str]:
    if pd.isna(value) or not str(value).strip():
        return None
    label = str(value).strip()
    return SERVICE_CATEGORY_ALIASES.get(_header_key(label), label)


def _optional_text(value) -> Optional[str]:
    if pd.isna(value):
        return None
    text = str(value).strip()
    return text or None


def read_uploaded_dataset(filename: str, contents: bytes) -> pd.DataFrame:
    extension = os.path.splitext(filename.lower())[1]
    try:
        if extension == ".csv":
            dataframe = pd.read_csv(io.BytesIO(contents), encoding="utf-8-sig")
        elif extension in {".xlsx", ".xls"}:
            dataframe = pd.read_excel(io.BytesIO(contents))
        else:
            raise HTTPException(
                status_code=400,
                detail="Format file tidak didukung. Gunakan CSV atau Excel.",
            )
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"File tidak dapat dibaca: {exc}") from exc

    dataframe = _normalize_dataset_columns(dataframe)
    valid, message = validate_dataframe(dataframe, ["Komentar", "Tahun"])
    if not valid:
        raise HTTPException(status_code=400, detail=message)

    dataframe = clean_dataframe(dataframe, "Komentar")
    years = pd.to_numeric(dataframe["Tahun"], errors="coerce")
    invalid_years = years.isna() | (years % 1 != 0)
    if invalid_years.any():
        raise HTTPException(
            status_code=400,
            detail="Kolom Tahun harus berisi tahun berupa angka bulat pada setiap komentar.",
        )
    dataframe["Tahun"] = years.astype(int)
    if dataframe.empty:
        raise HTTPException(status_code=400, detail="File tidak berisi komentar yang dapat diproses.")

    if "Label Sentimen" in dataframe.columns:
        labels = dataframe["Label Sentimen"].map(_normalize_sentiment_label)
        if labels.isna().any():
            raise HTTPException(
                status_code=400,
                detail="Kolom Label Sentimen harus berisi Positif, Netral, atau Negatif pada setiap komentar.",
            )
        dataframe["Label Sentimen"] = labels

    if "Kategori Layanan" in dataframe.columns:
        categories = dataframe["Kategori Layanan"].map(_normalize_service_category)
        if categories.isna().any():
            raise HTTPException(
                status_code=400,
                detail="Kolom Kategori Layanan tidak boleh kosong pada setiap komentar.",
            )

    return dataframe

@app.get("/")
async def root():
    return {
        "message": "Feedback Analytics API",
        "version": "1.0.0",
        "status": "running",
        "endpoints": {
            "health": "/health",
            "upload": "/api/upload",
            "analyze": "/api/analyze",
            "analyze_face": "/api/analyze-face",
            "batch": "/api/batch",
            "chat": "/api/chat",
            "stats": "/api/stats",
            "comments": "/api/comments"
        }
    }

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "service": "feedback-analytics-api"
    }

@app.post("/api/analyze")
async def analyze_comment(request: CommentRequest):
    """
    Analisis satu komentar untuk sentimen dan kategori
    """
    try:
        # Preprocess text
        cleaned_text = preprocessor.preprocess(request.text)

        # Predict sentiment
        sentiment_result = sentiment_analyzer.predict(cleaned_text)

        # Predict category
        category_result = category_classifier.predict(cleaned_text)

        return CommentResponse(
            text=request.text,
            sentiment=sentiment_result["sentiment"],
            category=category_result["category"],
            confidence=(sentiment_result["confidence"] + category_result["confidence"]) / 2
        )
    except Exception as e:
        logger.error(f"Error analyzing comment: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/analyze-face")
async def analyze_face(file: UploadFile = File(...)):
    image_bytes = await file.read(8 * 1024 * 1024 + 1)
    if len(image_bytes) > 8 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="Ukuran foto melebihi batas 8 MB.")

    try:
        result = await asyncio.to_thread(facial_expression_analyzer.predict, image_bytes)
        return result
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        logger.exception("Error analyzing facial expression")
        raise HTTPException(
            status_code=503,
            detail="Model ekspresi wajah belum siap. Periksa koneksi backend dan coba lagi.",
        ) from exc

@app.post("/api/upload")
async def upload_file(file: UploadFile = File(...)):
    """
    Upload file CSV/Excel untuk batch processing
    """
    try:
        contents = await file.read()
        dataframe = read_uploaded_dataset(file.filename or "", contents)

        return {
            "filename": file.filename,
            "total_rows": len(dataframe),
            "valid_rows": len(dataframe),
            "columns": list(dataframe.columns),
            "message": "File berhasil diupload dan divalidasi"
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error uploading file: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/batch")
async def batch_process(file: UploadFile = File(...)):
    """
    Batch processing untuk analisis sentimen dan kategori
    """
    try:
        contents = await file.read()
        dataframe = read_uploaded_dataset(file.filename or "", contents)
        comments = dataframe["Komentar"].tolist()

        has_dataset_sentiment = "Label Sentimen" in dataframe.columns
        has_dataset_category = "Kategori Layanan" in dataframe.columns
        sentiment_results = [None] * len(dataframe)
        category_results = [None] * len(dataframe)
        if not has_dataset_sentiment or not has_dataset_category:
            cleaned_comments = preprocessor.batch_preprocess(comments)
            if not has_dataset_sentiment:
                sentiment_results = sentiment_analyzer.batch_predict(cleaned_comments)
            if not has_dataset_category:
                category_results = category_classifier.batch_predict(cleaned_comments)

        label_source = (
            "dataset"
            if has_dataset_sentiment and has_dataset_category
            else "mixed"
            if has_dataset_sentiment or has_dataset_category
            else "model"
        )
        records = []
        for position, (row_index, row) in enumerate(dataframe.iterrows()):
            sentiment = (
                row["Label Sentimen"]
                if has_dataset_sentiment
                else sentiment_results[position]["sentiment"]
            )
            category = (
                _normalize_service_category(row["Kategori Layanan"])
                if has_dataset_category
                else category_results[position]["category"]
            )
            model_confidences = []
            if not has_dataset_sentiment:
                model_confidences.append(sentiment_results[position]["confidence"])
            if not has_dataset_category:
                model_confidences.append(category_results[position]["confidence"])
            records.append({
                "source_row": int(row_index) + 1,
                "year": int(row["Tahun"]),
                "text": row["Komentar"],
                "original_category": _optional_text(row.get("Kategori Layanan")),
                "sentiment": sentiment,
                "category": category,
                "confidence": (
                    sum(model_confidences) / len(model_confidences)
                    if model_confidences
                    else None
                ),
                "label_source": label_source,
                "source_label_confidence": _optional_text(row.get("Keyakinan Label")),
                "source_label_method": _optional_text(row.get("Metode Label")),
                "verification_status": _optional_text(row.get("Status Verifikasi")),
            })

        created, stored_records = store_import(
            hashlib.sha256(contents).hexdigest(),
            file.filename or "dataset",
            records,
        )
        results = [BatchCommentResponse(**record) for record in stored_records]

        return BatchResponse(
            total=len(comments),
            processed=len(results),
            results=results,
            status="completed" if created else "already_imported",
            message=(
                "Data berhasil dianalisis dan disimpan."
                if created
                else "File ini sudah pernah diimpor; data tidak diduplikasi."
            ),
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in batch processing: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/stats")
async def get_stats(
    year: Optional[int] = None,
    category: Optional[str] = None,
    sentiment: Optional[str] = None,
):
    """
    Get statistics calculated from imported feedback records.
    """
    try:
        return WebsiteStats(
            **get_dashboard_stats(year=year, category=category, sentiment=sentiment)
        )
    except Exception as e:
        logger.error(f"Error getting stats: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/comments")
async def get_comments(
    limit: int = Query(default=20, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
    year: Optional[int] = None,
    category: Optional[str] = None,
    sentiment: Optional[str] = None,
    search: Optional[str] = None,
):
    """
    Get persisted feedback records with pagination and optional filters.
    """
    try:
        comments, total = load_comments(
            limit=limit,
            offset=offset,
            year=year,
            category=category,
            sentiment=sentiment,
            search=search,
        )
        return {
            "comments": comments,
            "total": total,
            "limit": limit,
            "offset": offset,
        }
    except Exception as e:
        logger.error(f"Error getting comments: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/chat")
async def chat(request: ChatRequest):
    """
    Chat dengan model LM Studio menggunakan konteks data website
    """
    try:
        stats = await get_stats()
        if stats.total_comments:
            context_parts = [
                f"Total komentar: {stats.total_comments}",
                f"Total positif: {stats.total_positif}",
                f"Total netral: {stats.total_netral}",
                f"Total negatif: {stats.total_negatif}",
            ]
            for category in stats.category_stats:
                context_parts.append(
                    f"{category['name']}: {category['total']} komentar; "
                    f"positif {category['positif']}, netral {category['netral']}, "
                    f"negatif {category['negatif']}"
                )
            for year, total in stats.yearly_totals.items():
                context_parts.append(f"Tahun {year}: {total} komentar")
            context = "\n".join(context_parts)
        else:
            context = "Belum ada data umpan balik yang diimpor."

        cleaned_text = preprocessor.preprocess(request.message)
        sentiment_result = sentiment_analyzer.predict(cleaned_text)
        category_result = category_classifier.predict(cleaned_text)
        response = await query_lm_studio(
            request.message,
            context,
            sentiment_result["sentiment"],
            category_result["category"],
        )
        summary_card = None
        sources = ["Dashboard"] if stats.total_comments else []
        if stats.total_comments:
            summary_card = {
                "title": "Statistik Data",
                "description": (
                    f"{stats.total_comments} komentar · "
                    f"{len(stats.category_stats)} kategori · "
                    f"{len(stats.available_years)} tahun"
                ),
            }

        return ChatResponse(
            message=response,
            sentiment=sentiment_result["sentiment"],
            category=category_result["category"],
            confidence=round((sentiment_result["confidence"] + category_result["confidence"]) / 2, 4),
            summary_card=summary_card,
            sources=sources
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in chat: {e}")
        raise HTTPException(status_code=500, detail=str(e))


async def query_lm_studio(message: str, context: str, sentiment: str, category: str) -> str:
    base_url = os.getenv("LM_STUDIO_BASE_URL", "http://localhost:1234/v1").rstrip("/")
    model = os.getenv("LM_STUDIO_MODEL", "recursivesi/flint")
    payload = json.dumps({
        "model": model,
        "messages": [
            {
                "role": "system",
                "content": (
                    "Anda adalah asisten analisis umpan balik mahasiswa Politeknik Caltex Riau. "
                    "Jawab dalam bahasa Indonesia dengan ringkas dan jelas. Gunakan hanya data "
                    "konteks berikut untuk menjawab pertanyaan tentang statistik; jangan mengarang "
                    "angka. Jika informasi tidak ada di konteks, nyatakan keterbatasannya. Untuk "
                    "komentar mahasiswa, tanggapi dengan empati dan sesuaikan nada jawaban dengan "
                    "hasil klasifikasi sentimen teks. Sentimen ditentukan dari teks, bukan dari foto.\n\n"
                    f"Hasil analisis teks: sentimen={sentiment}; kategori={category}.\n\n"
                    f"Konteks data dashboard:\n{context}"
                ),
            },
            {"role": "user", "content": message},
        ],
        "temperature": 0.3,
    }).encode("utf-8")
    req = Request(
        f"{base_url}/chat/completions",
        data=payload,
        headers={"Content-Type": "application/json"},
        method="POST",
    )

    def send_request():
        with urlopen(req, timeout=180) as response:
            return json.loads(response.read().decode("utf-8"))

    try:
        result = await asyncio.to_thread(send_request)
        answer = result["choices"][0]["message"]["content"]
        if not isinstance(answer, str) or not answer.strip():
            raise ValueError("LM Studio returned an empty response")
        return answer.strip()
    except HTTPError as exc:
        error_body = exc.read().decode("utf-8", errors="replace")
        logger.error("LM Studio returned HTTP %s: %s", exc.code, error_body)
        raise HTTPException(
            status_code=502,
            detail=f"LM Studio menolak permintaan (HTTP {exc.code}). Pastikan model '{model}' sudah dimuat.",
        ) from exc
    except (URLError, TimeoutError) as exc:
        logger.error("Could not reach LM Studio at %s: %s", base_url, exc)
        raise HTTPException(
            status_code=502,
            detail=f"Tidak dapat terhubung ke LM Studio di {base_url}. Pastikan server LM Studio aktif.",
        ) from exc
    except (KeyError, IndexError, ValueError, json.JSONDecodeError) as exc:
        logger.error("Invalid response from LM Studio: %s", exc)
        raise HTTPException(
            status_code=502,
            detail="Respons LM Studio tidak sesuai format OpenAI Chat Completions.",
        ) from exc


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)
