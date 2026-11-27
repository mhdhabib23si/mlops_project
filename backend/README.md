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
uvicorn main:app --host 127.0.0.1 --port 8000 --reload
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
Menganalisis file CSV/Excel dan menyimpan hasilnya di SQLite. Kolom wajib: `Komentar`
dan `Tahun` (nama kolom tidak peka kapitalisasi; `komentar` dan `tahun` juga diterima).
Kolom `label_sentimen` dan `kategori_layanan` yang tersedia akan dipertahankan sebagai
label sumber dan tidak diklasifikasikan ulang. Metadata keyakinan, metode, dan status
verifikasi sumber ikut disimpan; keyakinan kategoris tidak diubah menjadi angka.
Model hanya digunakan untuk label yang tidak disediakan. Baris komentar berulang
dipertahankan. Impor ulang file dengan isi yang sama tidak menggandakan hasil.

### GET /api/stats
Mengembalikan statistik agregat yang dihitung dari record SQLite.

### GET /api/comments
Mengembalikan record tersimpan dengan pagination (`limit`, `offset`) dan filter
opsional (`year`, `category`, `sentiment`, `search`).

## Penyimpanan

Database lokal default berada di `backend/feedback.sqlite3` dan dibuat otomatis saat
backend dijalankan. Ubah lokasi dengan `FEEDBACK_DB_PATH`. Docker Compose menyimpan
database pada volume persisten `feedback-data`. File database berisi komentar asli,
jadi jangan membagikan atau memasukkannya ke version control.

### POST /api/analyze-face
Menganalisis foto wajah menggunakan model ekspresi lokal, lalu mengembalikan
ekspresi, sentimen, dan tingkat keyakinan. Gunakan JPEG, PNG, atau WEBP hingga 8 MB.
Model default `dima806/facial_emotions_image_detection` diunduh dari Hugging Face
saat pertama kali dipakai. Kartu model melaporkan akurasi 90,92% dan recall 86,32%
untuk kelas `sad` pada test set mereka; metrik ini bukan jaminan akurasi untuk kamera
dan lingkungan project ini. Nama model dapat diganti melalui `FACIAL_EXPRESSION_MODEL`.
Jika skor `neutral` hanya unggul maksimal 10 poin persentase dari `sad`, API memilih
`sad` untuk mengurangi false negative ekspresi murung. Penyesuaian recall ini dapat
menambah false positive; respons juga menyertakan prediksi mentah model agar hasilnya transparan.

## Pipeline

1. **Preprocessing**: Bersihkan teks dari noise, lowercase, remove stopwords
2. **Sentiment Analysis**: IndoBERT untuk klasifikasi sentimen (Positif/Netral/Negatif)
3. **Category Classification**: LLaMA 3 8B Instruct untuk kategorisasi layanan

## Notes

- Model akan di-download secara otomatis saat pertama kali dijalankan
- Untuk LLaMA 3, pastikan Anda memiliki akses ke Hugging Face (mungkin perlu token)
- Jika GPU tidak tersedia, model akan berjalan di CPU (lebih lambat)
- Ada fallback rule-based jika model gagal di-load
