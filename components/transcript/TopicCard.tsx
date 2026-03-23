'use client'

import { useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import type { Topic } from '@/types'

function formatTimestamp(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

interface TopicCardProps {
  topic: Topic
}

export function TopicCard({ topic }: TopicCardProps) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="border border-border rounded-md overflow-hidden">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-secondary/40 transition-colors"
      >
        <span className="mt-0.5 shrink-0 text-muted-foreground">
          {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </span>

        <div className="flex-1 min-w-0 space-y-1.5">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="font-medium text-sm">{topic.title}</span>
            <span className="font-mono text-xs text-muted-foreground tabular-nums">
              {formatTimestamp(topic.startTime)} → {formatTimestamp(topic.endTime)}
            </span>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {topic.keywords.map((kw) => (
              <Badge key={kw} variant="muted">
                {kw}
              </Badge>
            ))}
          </div>
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 pt-1 border-t border-border bg-card/50">
          <p className="text-sm text-foreground/80 leading-relaxed">{topic.summary}</p>
        </div>
      )}
    </div>
  )
}
