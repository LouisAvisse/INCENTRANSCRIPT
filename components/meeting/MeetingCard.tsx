'use client'

import Link from 'next/link'
import { format } from 'date-fns'
import type { Meeting } from '@/types'

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function StatusBadge({ status }: { status: Meeting['status'] }) {
  const configs: Record<Meeting['status'], { label: string; dot: string; text: string }> = {
    recording: {
      label: 'recording',
      dot: 'bg-amber-500 animate-pulse',
      text: 'text-amber-400',
    },
    recorded: {
      label: 'recorded',
      dot: 'bg-zinc-500',
      text: 'text-zinc-400',
    },
    transcribing: {
      label: 'transcribing',
      dot: 'bg-blue-500 animate-spin',
      text: 'text-blue-400',
    },
    analyzed: {
      label: 'analyzed',
      dot: 'bg-emerald-500',
      text: 'text-emerald-400',
    },
    error: {
      label: 'error',
      dot: 'bg-red-500',
      text: 'text-red-400',
    },
  }

  const { label, dot, text } = configs[status]

  return (
    <span className={`inline-flex items-center gap-1.5 font-mono text-xs ${text}`}>
      <span className={`inline-block w-1.5 h-1.5 rounded-full ${dot}`} />
      {label}
    </span>
  )
}

interface MeetingCardProps {
  meeting: Meeting
}

export function MeetingCard({ meeting }: MeetingCardProps) {
  return (
    <Link
      href={`/meetings/${meeting.id}`}
      className="block border border-border rounded-md px-4 py-3 hover:border-border/80 hover:bg-card transition-colors group"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0 space-y-1">
          <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">
            {meeting.title}
          </p>
          <div className="flex items-center gap-3 text-xs text-muted-foreground font-mono">
            <span>{format(new Date(meeting.createdAt), 'MMM d, yyyy · HH:mm')}</span>
            {meeting.duration > 0 && (
              <>
                <span className="text-border">·</span>
                <span>{formatDuration(meeting.duration)}</span>
              </>
            )}
          </div>
        </div>
        <StatusBadge status={meeting.status} />
      </div>
    </Link>
  )
}
