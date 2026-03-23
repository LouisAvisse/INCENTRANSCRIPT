'use client'

import { useState } from 'react'
import { CheckSquare, Square } from 'lucide-react'
import type { ActionItem, Topic } from '@/types'

interface ActionItemListProps {
  actionItems: ActionItem[]
  topics: Topic[]
}

export function ActionItemList({ actionItems, topics }: ActionItemListProps) {
  const [checked, setChecked] = useState<Set<string>>(new Set())

  if (actionItems.length === 0) {
    return (
      <p className="text-sm text-muted-foreground font-mono">No action items identified.</p>
    )
  }

  const toggle = (id: string) => {
    setChecked((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  // Group items: those with a topicId first (grouped), then ungrouped
  const topicMap = new Map(topics.map((t) => [t.id, t]))
  const grouped = new Map<string, ActionItem[]>()
  const ungrouped: ActionItem[] = []

  for (const item of actionItems) {
    if (item.topicId && topicMap.has(item.topicId)) {
      const group = grouped.get(item.topicId) ?? []
      group.push(item)
      grouped.set(item.topicId, group)
    } else {
      ungrouped.push(item)
    }
  }

  return (
    <div className="space-y-6">
      {Array.from(grouped.entries()).map(([topicId, items]) => {
        const topic = topicMap.get(topicId)
        return (
          <div key={topicId}>
            <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider mb-2">
              {topic?.title ?? 'Unknown topic'}
            </p>
            <ItemGroup items={items} checked={checked} onToggle={toggle} />
          </div>
        )
      })}

      {ungrouped.length > 0 && (
        <div>
          {grouped.size > 0 && (
            <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider mb-2">
              Other
            </p>
          )}
          <ItemGroup items={ungrouped} checked={checked} onToggle={toggle} />
        </div>
      )}
    </div>
  )
}

function ItemGroup({
  items,
  checked,
  onToggle,
}: {
  items: ActionItem[]
  checked: Set<string>
  onToggle: (id: string) => void
}) {
  return (
    <ul className="space-y-2">
      {items.map((item) => {
        const done = checked.has(item.id)
        return (
          <li key={item.id}>
            <button
              onClick={() => onToggle(item.id)}
              className="flex items-start gap-3 w-full text-left group"
            >
              <span className="mt-0.5 shrink-0 text-muted-foreground group-hover:text-foreground transition-colors">
                {done ? (
                  <CheckSquare className="w-4 h-4 text-primary" />
                ) : (
                  <Square className="w-4 h-4" />
                )}
              </span>
              <span
                className={`text-sm leading-relaxed transition-colors ${
                  done ? 'line-through text-muted-foreground' : 'text-foreground/90'
                }`}
              >
                {item.text}
              </span>
            </button>
          </li>
        )
      })}
    </ul>
  )
}
