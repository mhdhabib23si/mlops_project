export function formatNumber(value: number): string {
  return new Intl.NumberFormat('id-ID').format(value)
}

export function formatPercent(value: number, digits = 1): string {
  return `${value.toFixed(digits).replace('.', ',')}%`
}

export function percentOf(part: number, total: number): number {
  if (!total) return 0
  return (part / total) * 100
}
