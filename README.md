# Feedback Analytics · PCRSURVEI

Website admin untuk analisis umpan balik mahasiswa Politeknik Caltex Riau, mengikuti spesifikasi tampilan di `TAMPILAN.docx`.

## Struktur folder

```
feedback-analytics/
├── public/images/          # aset publik (foto kampus)
├── src/
│   ├── components/
│   │   ├── charts/         # donut, bar, tren
│   │   ├── data/           # modal unggah & drawer detail
│   │   ├── layout/         # sidebar & shell
│   │   └── ui/             # ikon, filter, badge
│   ├── context/            # auth, filter, job pemrosesan
│   ├── data/               # data simulasi dashboard
│   ├── lib/                # format angka & API client
│   ├── pages/              # login, dashboard, data, proses
│   ├── styles/             # desain sistem
│   └── types/
├── backend/                # Python API backend
│   ├── main.py            # FastAPI server
│   ├── preprocessing.py  # Text preprocessing
│   ├── sentiment_model.py # IndoBERT sentiment analysis
│   ├── category_model.py  # LLaMA 3 category classification
│   └── requirements.txt   # Python dependencies
├── package.json
└── README.md
```

## Menjalankan

### 1. Install Frontend Dependencies

```bash
npm install
```

### 2. Setup Backend Python

```bash
cd backend
python -m venv venv
venv\Scripts\activate  # Windows
# source venv/bin/activate  # Linux/Mac
pip install -r requirements.txt
```

### 3. Start Backend Server

**Windows:**
```bash
cd backend
start.bat
```

**Linux/Mac:**
```bash
cd backend
chmod +x start.sh
./start.sh
```

Atau langsung:
```bash
cd backend
venv\Scripts\python main.py  # Windows
# venv/bin/python main.py  # Linux/Mac
```

Backend akan berjalan di: http://localhost:8000

### 4. Start Frontend Server

```bash
npm run dev
```

Buka `http://localhost:5173`.

Akun demo: `admin@pcr.ac.id` / `admin123`.

## Halaman

- Login admin (sukses & error)
- Dashboard (KPI, grafik, insight, komentar terbaru)
- Data umpan balik (cari, filter, pagination, detail, unggah)
- Proses data (antrean, validasi, progres, selesai, gagal)

## Pipeline ML

Preprocessing → Sentimen IndoBERT → Kategori LLaMA 3 8B Instruct

### Backend API Endpoints

- `GET /` - API info
- `GET /health` - Health check
- `POST /api/analyze` - Analisis satu komentar
- `POST /api/upload` - Upload dan validasi file
- `POST /api/batch` - Batch processing

API Documentation: http://localhost:8000/docs

## Notes

- Data bersifat simulasi di frontend, backend menyediakan endpoint untuk integrasi ML model sebenarnya
- Model IndoBERT dan LLaMA 3 akan di-download otomatis saat pertama kali backend dijalankan
- Backend memiliki fallback rule-based jika model gagal di-load
- Untuk menggunakan LLaMA 3 penuh, pastikan GPU tersedia dan cukup VRAM
