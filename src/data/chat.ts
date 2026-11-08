import type { ChatSession } from '../types/chat'

export const CHAT_SESSIONS: ChatSession[] = [
  {
    id: 'session-1',
    title: 'Analisis Sentimen Kategori Keuangan',
    createdAt: new Date('2025-12-20T09:30:00'),
    updatedAt: new Date('2025-12-20T10:15:00'),
    messages: [
      {
        id: 'msg-1-1',
        sessionId: 'session-1',
        sender: 'bot',
        content: 'Halo! Saya adalah asisten AI Analisis Umpan Balik PCR. Ada yang bisa saya bantu terkait data umpan balik mahasiswa?',
        timestamp: new Date('2025-12-20T09:30:00'),
      },
      {
        id: 'msg-1-2',
        sessionId: 'session-1',
        sender: 'user',
        content: 'Bagaimana tren sentimen untuk kategori Keuangan tahun 2025?',
        timestamp: new Date('2025-12-20T09:32:00'),
      },
      {
        id: 'msg-1-3',
        sessionId: 'session-1',
        sender: 'bot',
        content: 'Berdasarkan data tahun 2025, kategori Keuangan menunjukkan peningkatan signifikan dalam sentimen positif. Dari 2.100 komentar, proporsi sentimen positif mencapai 52,7%.',
        timestamp: new Date('2025-12-20T09:33:00'),
        summaryCard: {
          title: 'Ringkasan Kategori Keuangan 2025',
          description: 'Total: 2.100 komentar | Positif: 52,7% | Netral: 24,5% | Negatif: 22,8%',
        },
      },
    ],
  },
  {
    id: 'session-2',
    title: 'Insight Sarana & Prasarana',
    createdAt: new Date('2025-12-19T14:20:00'),
    updatedAt: new Date('2025-12-19T14:45:00'),
    messages: [
      {
        id: 'msg-2-1',
        sessionId: 'session-2',
        sender: 'bot',
        content: 'Halo! Saya adalah asisten AI Analisis Umpan Balik PCR. Ada yang bisa saya bantu terkait data umpan balik mahasiswa?',
        timestamp: new Date('2025-12-19T14:20:00'),
      },
      {
        id: 'msg-2-2',
        sessionId: 'session-2',
        sender: 'user',
        content: 'Kategori apa yang memiliki proporsi sentimen negatif tertinggi?',
        timestamp: new Date('2025-12-19T14:22:00'),
      },
      {
        id: 'msg-2-3',
        sessionId: 'session-2',
        sender: 'bot',
        content: 'Berdasarkan analisis data, kategori Sarana & Prasarana memiliki proporsi sentimen negatif tertinggi sebesar 23,0%. Isu utama yang sering muncul adalah kondisi fasilitas kelas yang perlu perbaikan dan maintenance rutin.',
        timestamp: new Date('2025-12-19T14:23:00'),
        summaryCard: {
          title: 'Kategori dengan Negatif Tertinggi',
          description: 'Sarana & Prasarana: 23,0% negatif dari 1.700 komentar',
        },
      },
    ],
  },
  {
    id: 'session-3',
    title: 'Perbandingan Tahunan Layanan TI',
    createdAt: new Date('2025-12-18T11:00:00'),
    updatedAt: new Date('2025-12-18T11:30:00'),
    messages: [
      {
        id: 'msg-3-1',
        sessionId: 'session-3',
        sender: 'bot',
        content: 'Halo! Saya adalah asisten AI Analisis Umpan Balik PCR. Ada yang bisa saya bantu terkait data umpan balik mahasiswa?',
        timestamp: new Date('2025-12-18T11:00:00'),
      },
      {
        id: 'msg-3-2',
        sessionId: 'session-3',
        sender: 'user',
        content: 'Bagaimana perubahan sentimen untuk Sistem & TI dari tahun 2024 ke 2025?',
        timestamp: new Date('2025-12-18T11:05:00'),
      },
      {
        id: 'msg-3-3',
        sessionId: 'session-3',
        sender: 'bot',
        content: 'Untuk kategori Sistem & TI, terdapat peningkatan proporsi sentimen positif dari 46,3% di tahun 2024 menjadi 54,8% di tahun 2025. Peningkatan ini menunjukkan adanya perbaikan dalam layanan sistem dan teknologi informasi.',
        timestamp: new Date('2025-12-18T11:06:00'),
        summaryCard: {
          title: 'Tren Sistem & TI (2024 vs 2025)',
          description: 'Positif: 46,3% → 54,8% (+8,5 poin)',
        },
      },
    ],
  },
]
