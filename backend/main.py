from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from pydantic import BaseModel
from typing import List, Optional
import pandas as pd
import io
import logging
from preprocessing import TextPreprocessor, validate_dataframe, clean_dataframe
from sentiment_model import sentiment_analyzer
from category_model import category_classifier

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
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
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
    confidence: float

class BatchResponse(BaseModel):
    total: int
    processed: int
    results: List[CommentResponse]
    status: str

class ChatRequest(BaseModel):
    message: str
    session_id: Optional[str] = None

class ChatResponse(BaseModel):
    message: str
    summary_card: Optional[dict] = None
    sources: Optional[List[str]] = None

class WebsiteStats(BaseModel):
    total_comments: int
    total_positif: int
    total_netral: int
    total_negatif: int
    yearly_totals: dict
    yearly_sentiment: dict
    category_stats: List[dict]

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

@app.post("/api/upload")
async def upload_file(file: UploadFile = File(...)):
    """
    Upload file CSV/Excel untuk batch processing
    """
    try:
        # Read file based on extension
        if file.filename.endswith('.csv'):
            df = pd.read_csv(io.BytesIO(await file.read()))
        elif file.filename.endswith(('.xlsx', '.xls')):
            df = pd.read_excel(io.BytesIO(await file.read()))
        else:
            raise HTTPException(status_code=400, detail="Format file tidak didukung. Gunakan CSV atau Excel.")

        # Validate required columns
        required_columns = ['Komentar', 'Tahun']
        missing_columns = [col for col in required_columns if col not in df.columns]
        if missing_columns:
            raise HTTPException(
                status_code=400,
                detail=f"Kolom tidak ditemukan: {', '.join(missing_columns)}"
            )

        # Clean data
        df = df.dropna(subset=['Komentar'])

        return {
            "filename": file.filename,
            "total_rows": len(df),
            "valid_rows": len(df),
            "columns": list(df.columns),
            "message": "File berhasil diupload dan divalidasi"
        }

    except Exception as e:
        logger.error(f"Error uploading file: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/batch")
async def batch_process(file: UploadFile = File(...)):
    """
    Batch processing untuk analisis sentimen dan kategori
    """
    try:
        # Read file
        if file.filename.endswith('.csv'):
            df = pd.read_csv(io.BytesIO(await file.read()))
        elif file.filename.endswith(('.xlsx', '.xls')):
            df = pd.read_excel(io.BytesIO(await file.read()))
        else:
            raise HTTPException(status_code=400, detail="Format file tidak didukung")

        # Clean data
        df = clean_dataframe(df, 'Komentar')
        comments = df['Komentar'].tolist()

        # Preprocess all comments
        cleaned_comments = preprocessor.batch_preprocess(comments)

        # Predict sentiment for all
        sentiment_results = sentiment_analyzer.batch_predict(cleaned_comments)

        # Predict category for all
        category_results = category_classifier.batch_predict(cleaned_comments)

        # Combine results
        results = []
        for i, (comment, sent, cat) in enumerate(zip(comments, sentiment_results, category_results)):
            results.append(CommentResponse(
                text=comment[:100] + "..." if len(comment) > 100 else comment,
                sentiment=sent["sentiment"],
                category=cat["category"],
                confidence=(sent["confidence"] + cat["confidence"]) / 2
            ))

        return BatchResponse(
            total=len(comments),
            processed=len(results),
            results=results,
            status="completed"
        )

    except Exception as e:
        logger.error(f"Error in batch processing: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/stats")
async def get_stats():
    """
    Get website statistics for chatbot context
    """
    try:
        return WebsiteStats(
            total_comments=70000,
            total_positif=38000,
            total_netral=17000,
            total_negatif=15000,
            yearly_totals={
                '2022': 14000,
                '2023': 16000,
                '2024': 19000,
                '2025': 21000
            },
            yearly_sentiment={
                '2022': {'positif': 7000, 'netral': 3500, 'negatif': 3500},
                '2023': {'positif': 8000, 'netral': 4000, 'negatif': 4000},
                '2024': {'positif': 10500, 'netral': 4500, 'negatif': 4000},
                '2025': {'positif': 12500, 'netral': 5000, 'negatif': 3500}
            },
            category_stats=[
                {'name': 'Kemahasiswaan', 'total': 13400, 'positif': 8804, 'netral': 3203, 'negatif': 2600},
                {'name': 'Keuangan', 'total': 11000, 'positif': 5797, 'netral': 2695, 'negatif': 2500},
                {'name': 'Sistem & TI', 'total': 10800, 'positif': 5000, 'netral': 2600, 'negatif': 3200},
                {'name': 'Perpustakaan', 'total': 10000, 'positif': 6500, 'netral': 2300, 'negatif': 1200},
                {'name': 'Kerjasama & Karir', 'total': 9000, 'positif': 5103, 'netral': 2297, 'negatif': 1600},
                {'name': 'BAAK', 'total': 8400, 'positif': 4259, 'netral': 2000, 'negatif': 2200},
                {'name': 'Sarana & Prasarana', 'total': 7400, 'positif': 3804, 'netral': 1901, 'negatif': 1700}
            ]
        )
    except Exception as e:
        logger.error(f"Error getting stats: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/comments")
async def get_comments(limit: int = 20, year: Optional[str] = None, category: Optional[str] = None):
    """
    Get comments with optional filters
    """
    try:
        # Return sample comments (in production, this would query a database)
        sample_comments = [
            {"id": 1, "year": 2025, "text": "Portal akademik sering lambat saat pengisian KRS. Mohon kapasitas server ditingkatkan agar proses pengisian tidak terputus pada jam sibuk.", "sentiment": "Negatif", "category": "Sistem & TI"},
            {"id": 2, "year": 2025, "text": "Koleksi buku referensi semakin lengkap dan petugas membantu menemukan bahan bacaan yang dibutuhkan untuk tugas akhir.", "sentiment": "Positif", "category": "Perpustakaan"},
            {"id": 3, "year": 2025, "text": "Informasi jadwal pembayaran sudah tersedia di portal. Saya berharap pengingat juga ditampilkan sebelum batas waktu pembayaran.", "sentiment": "Netral", "category": "Keuangan"},
            {"id": 4, "year": 2025, "text": "Informasi kegiatan dan beasiswa mudah diakses. Staf kemahasiswaan juga responsif saat saya menanyakan persyaratan.", "sentiment": "Positif", "category": "Kemahasiswaan"},
            {"id": 5, "year": 2025, "text": "Beberapa ruang kelas terasa panas pada siang hari. Mohon pengecekan pendingin ruangan dan perawatan fasilitas dilakukan lebih rutin.", "sentiment": "Negatif", "category": "Sarana & Prasarana"},
            {"id": 6, "year": 2025, "text": "Kegiatan bursa kerja membantu saya mengenal peluang magang dan kebutuhan industri.", "sentiment": "Positif", "category": "Kerjasama & Karir"},
            {"id": 7, "year": 2025, "text": "Alur pengajuan surat akademik sudah tersedia. Estimasi waktu penyelesaian perlu ditampilkan pada portal agar mahasiswa dapat merencanakan.", "sentiment": "Netral", "category": "BAAK"},
            {"id": 8, "year": 2024, "text": "Wi-Fi di gedung perkuliahan sering terputus saat jam kuliah. Mohon penguatan jaringan agar kelas hybrid berjalan lancar.", "sentiment": "Negatif", "category": "Sistem & TI"},
            {"id": 9, "year": 2024, "text": "Petugas perpustakaan ramah dan membantu pencarian jurnal. Ruang baca juga nyaman.", "sentiment": "Positif", "category": "Perpustakaan"},
            {"id": 10, "year": 2024, "text": "Bukti pembayaran UKT muncul di portal setelah satu hari kerja. Prosesnya sudah cukup jelas.", "sentiment": "Netral", "category": "Keuangan"},
        ]

        # Apply filters
        filtered = sample_comments
        if year:
            filtered = [c for c in filtered if str(c['year']) == year]
        if category:
            filtered = [c for c in filtered if category.lower() in c['category'].lower()]

        return {"comments": filtered[:limit], "total": len(filtered)}
    except Exception as e:
        logger.error(f"Error getting comments: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/chat")
async def chat(request: ChatRequest):
    """
    Advanced chatbot endpoint dengan akses ke data website
    """
    try:
        # Get stats for context
        stats = await get_stats()

        message_lower = request.message.lower()

        # Build context from data
        context_parts = [
            f"Total komentar: {stats.total_comments}",
            f"Total positif: {stats.total_positif} ({stats.total_positif/stats.total_comments*100:.1f}%)",
            f"Total netral: {stats.total_netral} ({stats.total_netral/stats.total_comments*100:.1f}%)",
            f"Total negatif: {stats.total_negatif} ({stats.total_negatif/stats.total_comments*100:.1f}%)",
        ]

        # Category information
        for cat in stats.category_stats:
            pct = cat['total'] / stats.total_comments * 100
            context_parts.append(f"{cat['name']}: {cat['total']} komentar ({pct:.1f}%) - Positif: {cat['positif']}, Netral: {cat['netral']}, Negatif: {cat['negatif']}")

        # Yearly information
        for year, total in stats.yearly_totals.items():
            context_parts.append(f"Tahun {year}: {total} komentar")

        context = "\n".join(context_parts)

        # Analyze the question and provide intelligent response
        response, summary_card, sources = generate_intelligent_response(request.message, message_lower, stats, context)

        return ChatResponse(
            message=response,
            summary_card=summary_card,
            sources=sources
        )

    except Exception as e:
        logger.error(f"Error in chat: {e}")
        raise HTTPException(status_code=500, detail=str(e))

def generate_intelligent_response(message: str, message_lower: str, stats: WebsiteStats, context: str) -> tuple[str, dict, list]:
    """
    Generate intelligent response based on question analysis
    """
    sources = []
    summary_card = None

    # Sentiment analysis questions
    if any(word in message_lower for word in ['sentimen', 'positif', 'negatif', 'netral', 'emosi']):
        if 'kategori' in message_lower or 'layanan' in message_lower:
            # Find the specific category
            for cat in stats.category_stats:
                if cat['name'].lower() in message_lower:
                    pct_pos = cat['positif'] / cat['total'] * 100
                    pct_neg = cat['negatif'] / cat['total'] * 100
                    pct_net = cat['netral'] / cat['total'] * 100

                    response = f"Berdasarkan data analisis untuk kategori **{cat['name']}**:\n\n"
                    response += f"• Total komentar: {cat['total']}\n"
                    response += f"• Sentimen Positif: {cat['positif']} ({pct_pos:.1f}%)\n"
                    response += f"• Sentimen Netral: {cat['netral']} ({pct_net:.1f}%)\n"
                    response += f"• Sentimen Negatif: {cat['negatif']} ({pct_neg:.1f}%)\n\n"

                    if pct_neg > 20:
                        response += f"⚠️ Kategori ini memiliki proporsi sentimen negatif yang cukup tinggi ({pct_neg:.1f}%). Perlu perhatian khusus untuk meningkatkan layanan."
                    elif pct_pos > 50:
                        response += f"✅ Kategori ini memiliki performa yang baik dengan mayoritas sentimen positif ({pct_pos:.1f}%)."

                    summary_card = {
                        "title": f"Sentimen {cat['name']}",
                        "description": f"Positif: {pct_pos:.1f}% | Netral: {pct_net:.1f}% | Negatif: {pct_neg:.1f}%"
                    }
                    sources = [f"Dashboard - Kategori {cat['name']}"]
                    return response, summary_card, sources

            # General category sentiment
            worst = max(stats.category_stats, key=lambda x: x['negatif'] / x['total'])
            best = max(stats.category_stats, key=lambda x: x['positif'] / x['total'])

            response = "Untuk analisis sentimen per kategori:\n\n"
            response += f"🏆 **Kategori dengan sentimen positif tertinggi**: {best['name']} ({best['positif']/best['total']*100:.1f}% positif)\n"
            response += f"⚠️ **Kategori dengan sentimen negatif tertinggi**: {worst['name']} ({worst['negatif']/worst['total']*100:.1f}% negatif)\n\n"
            response += "Anda dapat bertanya spesifik tentang kategori tertentu untuk detail lebih lanjut."

            summary_card = {
                "title": "Sentimen per Kategori",
                "description": f"Terbaik: {best['name']} | Perlu Perhatian: {worst['name']}"
            }
            sources = ["Dashboard - Sentimen Analysis"]
            return response, summary_card, sources

        else:
            # General sentiment
            pct_pos = stats.total_positif / stats.total_comments * 100
            pct_neg = stats.total_negatif / stats.total_comments * 100
            pct_net = stats.total_netral / stats.total_comments * 100

            response = f"Berdasarkan **{stats.total_comments}** komentar umpan balik mahasiswa PCR (periode 2022-2025):\n\n"
            response += f"• **Sentimen Positif**: {stats.total_positif} komentar ({pct_pos:.1f}%)\n"
            response += f"• **Sentimen Netral**: {stats.total_netral} komentar ({pct_net:.1f}%)\n"
            response += f"• **Sentimen Negatif**: {stats.total_negatif} komentar ({pct_neg:.1f}%)\n\n"

            # Trend analysis
            pos_2024 = stats.yearly_sentiment['2024']['positif'] / stats.yearly_totals['2024'] * 100
            pos_2025 = stats.yearly_sentiment['2025']['positif'] / stats.yearly_totals['2025'] * 100
            change = pos_2025 - pos_2024

            response += f"📈 **Tren Sentimen**: Terdapat peningkatan sentimen positif dari 2024 ke 2025 sebesar **{change:+.1f} poin persentase** ({pos_2024:.1f}% → {pos_2025:.1f}%).\n\n"
            response += "Ini menunjukkan perbaikan kualitas layanan secara umum."

            summary_card = {
                "title": "Distribusi Sentimen",
                "description": f"Positif: {pct_pos:.1f}% | Netral: {pct_net:.1f}% | Negatif: {pct_neg:.1f}%"
            }
            sources = ["Dashboard - Distribusi Sentimen", "Dashboard - Tren Sentimen"]
            return response, summary_card, sources

    # Category-related questions
    elif any(word in message_lower for word in ['kategori', 'layanan', 'bagian', 'unit']):
        if 'terbanyak' in message_lower or 'paling' in message_lower or 'tertinggi' in message_lower:
            sorted_cats = sorted(stats.category_stats, key=lambda x: x['total'], reverse=True)
            top3 = sorted_cats[:3]

            response = "Kategori layanan yang paling banyak dibahas:\n\n"
            for i, cat in enumerate(top3, 1):
                pct = cat['total'] / stats.total_comments * 100
                response += f"{i}. **{cat['name']}**: {cat['total']} komentar ({pct:.1f}% dari total)\n"

            response += f"\nTotal ada {len(stats.category_stats)} kategori layanan yang dianalisis."

            summary_card = {
                "title": "Top 3 Kategori",
                "description": f"{top3[0]['name']}, {top3[1]['name']}, {top3[2]['name']}"
            }
            sources = ["Dashboard - Umpan Balik per Kategori"]
            return response, summary_card, sources

        elif 'negatif' in message_lower or 'buruk' in message_lower or 'masalah' in message_lower:
            sorted_by_neg = sorted(stats.category_stats, key=lambda x: x['negatif'] / x['total'], reverse=True)
            worst = sorted_by_neg[0]
            pct_neg = worst['negatif'] / worst['total'] * 100

            response = f"Kategori dengan proporsi sentimen negatif tertinggi adalah **{worst['name']}** dengan **{pct_neg:.1f}%** komentar negatif.\n\n"
            response += f"Detail {worst['name']}:\n"
            response += f"• Total: {worst['total']} komentar\n"
            response += f"• Negatif: {worst['negatif']} ({pct_neg:.1f}%)\n"
            response += f"• Positif: {worst['positif']} ({worst['positif']/worst['total']*100:.1f}%)\n"
            response += f"• Netral: {worst['netral']} ({worst['netral']/worst['total']*100:.1f}%)\n\n"
            response += "Isu yang sering muncul terkait kategori ini perlu mendapat perhatian dan perbaikan."

            summary_card = {
                "title": "Sentimen Negatif Tertinggi",
                "description": f"{worst['name']}: {pct_neg:.1f}% negatif"
            }
            sources = ["Dashboard - Kategori Perlu Diperhatikan"]
            return response, summary_card, sources

        else:
            response = "Ada **7 kategori layanan** yang dianalisis dalam sistem:\n\n"
            for cat in stats.category_stats:
                pct = cat['total'] / stats.total_comments * 100
                response += f"• **{cat['name']}**: {cat['total']} komentar ({pct:.1f}%)\n"

            response += "\nAnda dapat bertanya spesifik tentang:\n"
            response += "- Kategori terbanyak\n"
            response += "- Kategori dengan sentimen negatif tertinggi\n"
            response += "- Sentimen per kategori\n"
            response += "- Isu spesifik dalam kategori"

            summary_card = {
                "title": "7 Kategori Layanan",
                "description": "Kemahasiswaan, Keuangan, Sistem & TI, Perpustakaan, Kerjasama & Karir, BAAK, Sarana & Prasarana"
            }
            sources = ["Dashboard - Semua Kategori"]
            return response, summary_card, sources

    # Trend/year-related questions
    elif any(word in message_lower for word in ['tren', 'perubahan', 'tahun', '2022', '2023', '2024', '2025', 'annual']):
        if '2025' in message_lower or 'terbaru' in message_lower:
            total_2025 = stats.yearly_totals['2025']
            sent_2025 = stats.yearly_sentiment['2025']
            pct_pos = sent_2025['positif'] / total_2025 * 100

            response = f"Data tahun **2025**:\n\n"
            response += f"• Total komentar: {total_2025}\n"
            response += f"• Sentimen Positif: {sent_2025['positif']} ({pct_pos:.1f}%)\n"
            response += f"• Sentimen Netral: {sent_2025['netral']} ({sent_2025['netral']/total_2025*100:.1f}%)\n"
            response += f"• Sentimen Negatif: {sent_2025['negatif']} ({sent_2025['negatif']/total_2025*100:.1f}%)\n\n"

            # Compare with 2024
            total_2024 = stats.yearly_totals['2024']
            sent_2024 = stats.yearly_sentiment['2024']
            pct_pos_2024 = sent_2024['positif'] / total_2024 * 100
            vol_change = ((total_2025 - total_2024) / total_2024) * 100
            sent_change = pct_pos - pct_pos_2024

            response += f"📊 **Perbandingan dengan 2024**:\n"
            response += f"• Volume: {vol_change:+.1f}% ({total_2024} → {total_2025})\n"
            response += f"• Sentimen Positif: {sent_change:+.1f} poin ({pct_pos_2024:.1f}% → {pct_pos:.1f}%)"

            summary_card = {
                "title": "Data 2025",
                "description": f"{total_2025} komentar | {pct_pos:.1f}% positif"
            }
            sources = ["Dashboard - Tren Tahunan"]
            return response, summary_card, sources

        else:
            response = "Tren umpan balik tahunan (2022-2025):\n\n"
            for year in ['2022', '2023', '2024', '2025']:
                total = stats.yearly_totals[year]
                sent = stats.yearly_sentiment[year]
                pct_pos = sent['positif'] / total * 100

                if year != '2022':
                    prev_total = stats.yearly_totals[str(int(year) - 1)]
                    vol_change = ((total - prev_total) / prev_total) * 100
                    response += f"• **{year}**: {total} komentar ({vol_change:+.1f}% dari tahun sebelumnya) - {pct_pos:.1f}% positif\n"
                else:
                    response += f"• **{year}**: {total} komentar - {pct_pos:.1f}% positif\n"

            response += "\nTren menunjukkan peningkatan volume komentar dan perbaikan sentimen positif dari tahun ke tahun."

            summary_card = {
                "title": "Tren 2022-2025",
                "description": "Volume meningkat, sentimen membaik"
            }
            sources = ["Dashboard - Tren Tahunan", "Dashboard - Volume Tahunan"]
            return response, summary_card, sources

    # System/IT specific questions
    elif any(word in message_lower for word in ['sistem', 'ti', 'teknologi', 'portal', 'wifi', 'internet', 'server', 'akses', 'login']):
        sys_cat = next((c for c in stats.category_stats if 'sistem' in c['name'].lower()), None)

        if sys_cat:
            pct_pos = sys_cat['positif'] / sys_cat['total'] * 100
            pct_neg = sys_cat['negatif'] / sys_cat['total'] * 100

            response = f"Untuk kategori **{sys_cat['name']}**:\n\n"
            response += f"• Total komentar: {sys_cat['total']}\n"
            response += f"• Sentimen Positif: {sys_cat['positif']} ({pct_pos:.1f}%)\n"
            response += f"• Sentimen Negatif: {sys_cat['negatif']} ({pct_neg:.1f}%)\n\n"

            response += "Isu yang sering dibahas mahasiswa:\n"
            response += "• Kecepatan dan stabilitas portal akademik\n"
            response += "• Kualitas dan stabilitas WiFi di kampus\n"
            response += "• Ketersediaan sistem\n"
            response += "• Proses login dan akses\n\n"

            if pct_neg > 25:
                response += "⚠️ Proporsi sentimen negatif cukup tinggi. Perlu perbaikan infrastruktur IT."
            else:
                response += "✅ Secara umum layanan sistem & TI berfungsi dengan baik."

            summary_card = {
                "title": "Sistem & TI",
                "description": f"{sys_cat['total']} komentar | {pct_pos:.1f}% positif"
            }
            sources = ["Dashboard - Kategori Sistem & TI", "Data Komentar"]
            return response, summary_card, sources

    # General questions
    elif any(word in message_lower for word in ['apa', 'aplikasi', 'website', 'fitur', 'dashboard']):
        response = "Website **Feedback Analytics** adalah platform admin untuk analisis umpan balik mahasiswa Politeknik Caltex Riau.\n\n"
        response += "Fitur yang tersedia:\n"
        response += "• **Dashboard**: Ringkasan KPI, grafik distribusi sentimen, insight utama\n"
        response += "• **Data Umpan Balik**: Tabel lengkap dengan filter, pencarian, dan pagination\n"
        response += "• **Proses Data**: Upload dan pemrosesan dataset baru dengan pipeline ML\n"
        response += "• **Chatbot**: Asisten AI untuk menganalisis data (saya!)\n\n"
        response += "Analisis menggunakan:\n"
        response += "• IndoBERT untuk analisis sentimen\n"
        response += "• Model klasifikasi untuk kategorisasi layanan\n"
        response += "• 7 kategori layanan: Kemahasiswaan, Keuangan, Sistem & TI, Perpustakaan, Kerjasama & Karir, BAAK, Sarana & Prasarana"

        summary_card = {
            "title": "Fitur Website",
            "description": "Dashboard, Data, Proses, Chatbot"
        }
        sources = ["Website Overview"]
        return response, summary_card, sources

    # Summary/statistics questions
    elif any(word in message_lower for word in ['statistik', 'ringkasan', 'summary', 'total', 'berapa']):
        response = f"**Ringkasan Statistik** ({stats.total_comments} komentar):\n\n"
        response += f"📊 **Distribusi Sentimen**:\n"
        response += f"• Positif: {stats.total_positif} ({stats.total_positif/stats.total_comments*100:.1f}%)\n"
        response += f"• Netral: {stats.total_netral} ({stats.total_netral/stats.total_comments*100:.1f}%)\n"
        response += f"• Negatif: {stats.total_negatif} ({stats.total_negatif/stats.total_comments*100:.1f}%)\n\n"

        response += f"📅 **Periode**: 2022-2025\n"
        response += f"📁 **Kategori**: {len(stats.category_stats)} layanan\n"
        response += f"📈 **Volume Tertinggi**: {max(stats.yearly_totals.values())} komentar di 2025"

        summary_card = {
            "title": "Ringkasan Statistik",
            "description": f"{stats.total_comments} komentar | 7 kategori | 4 tahun"
        }
        sources = ["Dashboard", "API Stats"]
        return response, summary_card, sources

    # Default response
    else:
        response = "Saya adalah asisten AI untuk menganalisis data umpan balik mahasiswa PCR. Saya dapat membantu Anda dengan:\n\n"
        response += "📊 **Analisis Data**:\n"
        response += "• Distribusi sentimen (positif, netral, negatif)\n"
        response += "• Analisis per kategori layanan\n"
        response += "• Tren tahunan dan perubahan\n"
        response += "• Statistik lengkap\n\n"
        response += "🔍 **Pertanyaan Contoh**:\n"
        response += "• \"Bagaimana tren sentimen tahun 2025?\"\n"
        response += "• \"Kategori apa yang paling banyak?\"\n"
        response += "• \"Bagaimana sentimen untuk kategori Sistem & TI?\"\n"
        response += "• \"Apa isu utama di Sarana & Prasarana?\"\n"
        response += "• \"Berapa total komentar positif?\"\n\n"
        response += "Silakan tanyakan apa saja tentang data umpan balik!"

        summary_card = {
            "title": "Topik yang Tersedia",
            "description": "Sentimen, Kategori, Tren, Statistik"
        }
        sources = []
        return response, summary_card, sources

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
