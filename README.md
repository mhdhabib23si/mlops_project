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
│   ├── data/               # taksonomi filter, bukan data umpan balik
│   ├── lib/                # format angka & API client
│   ├── pages/              # login, dashboard, data, proses
│   ├── styles/             # desain sistem
│   └── types/
├── backend/                # Python API backend
│   ├── main.py            # FastAPI server
│   ├── storage.py         # persistensi SQLite
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

Data hasil impor disimpan pada volume Docker `feedback-data`, sehingga tetap ada
setelah container dimulai ulang. Untuk instalasi lokal, database bawaan berada di
`backend/feedback.sqlite3`; atur `FEEDBACK_DB_PATH` untuk mengganti lokasinya.

Volume `feedback-data` berisi database komentar asli. `docker compose down` tidak
menghapus volume tersebut; jangan gunakan `docker compose down -v` kecuali memang
ingin menghapus database dan cache model.

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

### Alur umpan balik pengguna dan chatbot admin

Pengguna umum wajib mengambil foto melalui kamera sebelum dapat mengirim umpan balik. Foto
dikirim sementara ke backend untuk analisis ekspresi wajah, lalu komentar dianalisis untuk
sentimen teks dan kategori layanan. Foto tidak disimpan permanen. Pengguna tidak menggunakan
chatbot; chatbot analisis hanya tersedia di area admin. Hasil analisis dari form publik saat ini
hanya ditampilkan dan belum disimpan sebagai data umpan balik.

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

Login administrator masih memakai kredensial pengembangan yang ditetapkan pada frontend;
ganti dengan autentikasi backend sebelum deployment produksi.

## Halaman

- Chatbot publik: `/user/ef99d130-afc1-475d-9fd3-0120f69f6bdd` (tanpa login; foto kamera diambil sebelum chat dimulai)
- Login administrator: `/admin/login/4fd4f326-2efa-489e-96f5-ba824cb6ed0f`
- Dashboard admin: `/admin/dashboard/8984f7d0-62ed-47a4-b501-51bdb17cf452`
- Data umpan balik: `/admin/data/69626d18-f31e-46bf-9520-f28ab8a3fe23`
- Proses data: `/admin/proses/08997c15-cd26-41bc-8d96-aa18bad3b5a0`
- Chatbot admin: `/admin/chatbot/d38228c1-843a-4f1c-b7d0-df9e70009315`
- UUID rute bersifat tetap per halaman dan didefinisikan di `src/lib/routes.ts`. URL lama tetap diarahkan ke URL baru.
- Middleware frontend mengarahkan UUID yang tidak valid ke URL resmi halaman; area admin tetap memerlukan login.
- Dashboard (KPI, grafik, insight, komentar terbaru dari data SQLite)
- Data umpan balik (cari, filter, pagination, detail, unggah)
- Proses data (antrean, validasi, progres, selesai, gagal)

## Pipeline ML

Label sentimen/kategori dari dataset dipertahankan jika tersedia; model hanya
memprediksi label yang tidak disertakan.

### Backend API Endpoints

- `GET /` - API info
- `GET /health` - Health check
- `POST /api/analyze` - Analisis satu komentar
- `POST /api/upload` - Upload dan validasi file
- `POST /api/batch` - Analisis dan penyimpanan dataset ke SQLite
- `GET /api/stats` - Statistik dari dataset yang tersimpan
- `GET /api/comments` - Data komentar dengan pagination dan filter

API Documentation: http://localhost:8000/docs

## Notes

- Dashboard dan chatbot statistik hanya menggunakan hasil impor yang tersimpan; sebelum impor, tampilan data kosong.
- File CSV/Excel memerlukan kolom komentar dan tahun (nama kolom tidak peka kapitalisasi, termasuk `komentar`/`tahun`). Label `label_sentimen` dan `kategori_layanan` yang tersedia dipertahankan, bersama metadata metode dan status verifikasinya; label tersebut tidak diklasifikasikan ulang.
- Jika label sumber tidak disediakan, backend memakai model untuk memprediksi label yang hilang. Checkpoint model sentimen/kategori belum fine-tuned, jadi prediksi tersebut perlu divalidasi.
- Mengimpor file dengan isi yang sama tidak menggandakan record.
- Data komentar bersifat sensitif dan disimpan pada SQLite lokal; lindungi file database serta volume backup.
- API data belum memiliki autentikasi backend. Jangan mengekspos backend ke jaringan publik sebelum autentikasi server diterapkan.
- Model sentimen/kategori saat ini belum memakai checkpoint fine-tuned; validasi dan fine-tuning diperlukan sebelum memakai prediksinya sebagai hasil penelitian.
- Model IndoBERT dan LLaMA 3 akan di-download otomatis saat pertama kali backend dijalankan
- Backend memiliki fallback rule-based jika model gagal di-load
- Untuk menggunakan LLaMA 3 penuh, pastikan GPU tersedia dan cukup VRAM
