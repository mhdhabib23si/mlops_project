export function SummaryCard({
  title,
  description,
}: {
  title: string
  description: string
}) {
  return (
    <div className="summary-card">
      <strong>{title}</strong>
      <p>{description}</p>
    </div>
  )
}
