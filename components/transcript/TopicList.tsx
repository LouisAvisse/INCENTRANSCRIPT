import { TopicCard } from './TopicCard'
import type { Topic } from '@/types'

interface TopicListProps {
  topics: Topic[]
}

export function TopicList({ topics }: TopicListProps) {
  if (topics.length === 0) {
    return (
      <p className="text-sm text-muted-foreground font-mono">No topics identified.</p>
    )
  }

  return (
    <div className="space-y-2">
      {topics.map((topic) => (
        <TopicCard key={topic.id} topic={topic} />
      ))}
    </div>
  )
}
