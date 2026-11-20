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

### Menjalankan dengan Docker

Docker menjalankan frontend dan backend sebagai satu stack:

```bash
docker compose up --build
```

- Frontend: http://localhost:8081
- Backend API: http://localhost:8001
- Dokumentasi API: http://localhost:8001/docs

Hentikan stack:

```bash
docker compose down
```

Untuk menghapus juga cache model Hugging Face:

```bash
docker compose down -v
```

Jika ingin memakai token Hugging Face, buat file `.env` di folder project:

```env
HF_TOKEN=token_anda
```

### Integrasi LM Studio / Bionic

Chatbot menggunakan OpenAI-compatible API dari LM Studio. Atur server LM Studio aktif
di port `1234`, muat model `recursivesi/flint`, dan biarkan **Just-in-time model loading**
aktif. Compose menghubungkan container ke host melalui `host.docker.internal`.

Pengaturan bawaan:

```env
LM_STUDIO_BASE_URL=http://host.docker.internal:1234/v1
LM_STUDIO_MODEL=recursivesi/flint
```

Jika model yang dimuat berbeda, ubah `LM_STUDIO_MODEL` di file `.env`, lalu jalankan
ulang `docker compose up -d`.

### Deteksi ekspresi wajah

Fitur **Foto Sentimen** menganalisis foto melalui backend aplikasi menggunakan
`trpakov/vit-face-expression` dan OpenCV. Model mendeteksi wajah, lalu memetakan
ekspresi senang ke Positif, datar/terkejut ke Netral, dan sedih/marah/takut/jijik
ke Negatif. Foto hanya dikirim ke backend aplikasi untuk inferensi, tidak diteruskan
ke LM Studio. Model ekspresi diunduh dari Hugging Face saat pertama kali dipakai dan
disimpan di cache Docker. Model card melaporkan akurasi uji sekitar 71% pada FER2013;
hasil prediksi tetap perkiraan dan dapat dipengaruhi pencahayaan, posisi, serta variasi wajah.

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
