# Backend API - Feedback Analytics

Backend Python untuk analisis umpan balik mahasiswa PCR menggunakan:
- IndoBERT untuk analisis sentimen
- LLaMA 3 8B Instruct untuk klasifikasi kategori
- FastAPI untuk REST API

## Setup

### 1. Create Virtual Environment

```bash
python -m venv venv
```

### 2. Activate Virtual Environment

**Windows:**
```bash
venv\Scripts\activate
```

**Linux/Mac:**
```bash
source venv/bin/activate
```

### 3. Install Dependencies

```bash
pip install -r requirements.txt
```

### 4. Configure Environment

Copy `.env.example` to `.env`:
```bash
copy .env.example .env
```

## Running the Server

```bash
python main.py
```

Or using uvicorn directly:
```bash
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

API akan berjalan di: http://localhost:8000

## API Documentation

Buka http://localhost:8000/docs untuk melihat dokumentasi API interaktif (Swagger UI).

## Endpoints

### GET /
Health check dan informasi API

### GET /health
Health check sederhana

### POST /api/analyze
Analisis satu komentar untuk sentimen dan kategori

**Request:**
```json
{
  "text": "Portal akademik sering lambat saat pengisian KRS"
}
```

**Response:**
```json
{
  "text": "Portal akademik sering lambat saat pengisian KRS",
  "sentiment": "Negatif",
  "category": "Sistem & TI",
  "confidence": 0.85
}
```

### POST /api/upload
Upload file CSV/Excel untuk validasi

### POST /api/batch
Batch processing untuk analisis sentimen dan kategori

## Pipeline

1. **Preprocessing**: Bersihkan teks dari noise, lowercase, remove stopwords
2. **Sentiment Analysis**: IndoBERT untuk klasifikasi sentimen (Positif/Netral/Negatif)
3. **Category Classification**: LLaMA 3 8B Instruct untuk kategorisasi layanan

## Notes

- Model akan di-download secara otomatis saat pertama kali dijalankan
- Untuk LLaMA 3, pastikan Anda memiliki akses ke Hugging Face (mungkin perlu token)
- Jika GPU tidak tersedia, model akan berjalan di CPU (lebih lambat)
- Ada fallback rule-based jika model gagal di-load
