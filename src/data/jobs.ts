import type { ProcessJob } from '../types'

export const INITIAL_JOBS: ProcessJob[] = [
  {
    id: 'job-1',
    fileName: 'pcrsurvei_antrean_simulasi.csv',
    fileSizeLabel: '',
    status: 'menunggu',
    message: 'File telah dipilih. Validasi dan analisis belum dimulai.',
  },
  {
    id: 'job-2',
    fileName: 'pcrsurvei_validasi_simulasi.xlsx',
    fileSizeLabel: '',
    status: 'memvalidasi',
    message: 'Sedang memeriksa format file, kolom, dan kelengkapan data.',
  },
  {
    id: 'job-3',
    fileName: 'pcrsurvei_proses_simulasi.csv',
    fileSizeLabel: '',
    status: 'memproses',
    message: 'Validasi berhasil · 1.000 komentar · Klasifikasi kategori sedang berjalan.',
    progress: {
      preprocessing: 1000,
      sentiment: 1000,
      category: 600,
      saved: 0,
      total: 1000,
    },
  },
  {
    id: 'job-4',
    fileName: 'pcrsurvei_selesai_simulasi.xlsx',
    fileSizeLabel: '',
    status: 'selesai',
    message: '1.000 dari 1.000 komentar berhasil dianalisis dan disimpan.',
  },
  {
    id: 'job-5',
    fileName: 'pcrsurvei_tidak_valid_simulasi.csv',
    fileSizeLabel: '',
    status: 'gagal',
    message: 'Validasi gagal. Analisis belum dimulai dan tidak ada data yang disimpan.',
    errorDetail:
      'Kolom Komentar tidak ditemukan dan Tahun kosong pada baris 12. Perbaiki struktur file, lalu unggah kembali dalam format CSV atau Excel.',
  },
]
