'use client'

import type { TranscriptSegment } from '@/types'

function formatTimestamp(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

interface TranscriptViewProps {
  segments: TranscriptSegment[]
  rawText: string
}

export function TranscriptView({ segments, rawText }: TranscriptViewProps) {
  if (segments.length === 0) {
    return (
      <div className="font-mono text-sm text-foreground/80 whitespace-pre-wrap leading-relaxed">
        {rawText}
      </div>
    )
  }

  return (
    <div className="space-y-1">
      {segments.map((seg, i) => (
        <div key={i} className="flex gap-4 group">
          <span className="font-mono text-xs text-muted-foreground shrink-0 pt-0.5 tabular-nums w-10">
            {formatTimestamp(seg.start)}
          </span>
          <p className="text-sm text-foreground/90 leading-relaxed">{seg.text}</p>
        </div>
      ))}
    </div>
  )
}
