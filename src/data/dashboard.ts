import type { ServiceCategory } from '../types'

export const SURVEY_YEARS = ['2022', '2023', '2024', '2025'] as const

export const SERVICE_CATEGORIES: ServiceCategory[] = [
  'Kemahasiswaan',
  'Keuangan',
  'Sistem & TI',
  'Perpustakaan',
  'Kerjasama & Karir',
  'BAAK',
  'Sarana & Prasarana',
]

export const YEARLY_TOTALS: Record<string, number> = {
  '2022': 14000,
  '2023': 16000,
  '2024': 19000,
  '2025': 21000,
}

export const YEARLY_SENTIMENT: Record<
  string,
  { positif: number; netral: number; negatif: number }
> = {
  '2022': { positif: 7000, netral: 3500, negatif: 3500 },
  '2023': { positif: 8000, netral: 4000, negatif: 4000 },
  '2024': { positif: 10500, netral: 4500, negatif: 4000 },
  '2025': { positif: 12500, netral: 5000, negatif: 3500 },
}

export interface CategoryStat {
  name: ServiceCategory
  total: number
  positif: number
  netral: number
  negatif: number
}

export const CATEGORY_STATS: CategoryStat[] = [
  { name: 'Kemahasiswaan', total: 13400, positif: 8804, netral: 3203, negatif: 2600 },
  { name: 'Keuangan', total: 11000, positif: 5797, netral: 2695, negatif: 2500 },
  { name: 'Sistem & TI', total: 10800, positif: 5000, netral: 2600, negatif: 3200 },
  { name: 'Perpustakaan', total: 10000, positif: 6500, netral: 2300, negatif: 1200 },
  { name: 'Kerjasama & Karir', total: 9000, positif: 5103, netral: 2297, negatif: 1600 },
  { name: 'BAAK', total: 8400, positif: 4259, netral: 2000, negatif: 2200 },
  { name: 'Sarana & Prasarana', total: 7400, positif: 3804, netral: 1901, negatif: 1700 },
]

export const TOTAL_COMMENTS = 70000
export const TOTAL_POSITIF = 38000
export const TOTAL_NETRAL = 17000
export const TOTAL_NEGATIF = 15000
