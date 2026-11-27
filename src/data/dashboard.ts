import type { ServiceCategory } from '../types'

export const SERVICE_CATEGORIES: ServiceCategory[] = [
  'Kemahasiswaan',
  'Keuangan',
  'Sistem & TI',
  'Perpustakaan',
  'Kerjasama & Karir',
  'BAAK',
  'Sarana & Prasarana',
]

export interface CategoryStat {
  name: string
  total: number
  positif: number
  netral: number
  negatif: number
}
