import { SERVICE_CATEGORIES, SURVEY_YEARS } from '../../data/dashboard'
import type { Filters } from '../../types'
import { IconRefresh } from './Icons'

export function FilterBar({
  filters,
  onChange,
  onReset,
}: {
  filters: Filters
  onChange: (next: Filters) => void
  onReset: () => void
}) {
  return (
    <div className="filter-bar">
      <label className="field">
        <span>Tahun survei</span>
        <select
          value={filters.year}
          onChange={(e) => onChange({ ...filters, year: e.target.value })}
        >
          <option value="all">Semua tahun (2022-2025)</option>
          {SURVEY_YEARS.map((year) => (
            <option key={year} value={year}>
              {year}
            </option>
          ))}
        </select>
      </label>
      <label className="field">
        <span>Kategori layanan</span>
        <select
          value={filters.category}
          onChange={(e) => onChange({ ...filters, category: e.target.value })}
        >
          <option value="all">Semua kategori</option>
          {SERVICE_CATEGORIES.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
      </label>
      <label className="field">
        <span>Sentimen</span>
        <select
          value={filters.sentiment}
          onChange={(e) => onChange({ ...filters, sentiment: e.target.value })}
        >
          <option value="all">Semua sentimen</option>
          <option value="Positif">Positif</option>
          <option value="Netral">Netral</option>
          <option value="Negatif">Negatif</option>
        </select>
      </label>
      <button type="button" className="text-btn" onClick={onReset}>
        <IconRefresh size={16} /> Atur ulang
      </button>
    </div>
  )
}
