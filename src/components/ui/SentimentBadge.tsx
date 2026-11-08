import type { Sentiment } from '../../types'

export function SentimentBadge({ sentiment }: { sentiment: Sentiment }) {
  return <span className={`badge badge-${sentiment.toLowerCase()}`}>{sentiment}</span>
}
