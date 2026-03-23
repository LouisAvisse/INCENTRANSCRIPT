'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { Mic } from 'lucide-react'
import { useMeetingsStore } from '@/store/meetings'
import { MeetingCard } from './MeetingCard'
import { Skeleton } from '@/components/ui/skeleton'

export function MeetingList() {
  const { meetings, isLoading, loadMeetings } = useMeetingsStore()

  useEffect(() => {
    loadMeetings()
  }, [loadMeetings])

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    )
  }

  if (meetings.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-5">
        <div className="w-12 h-12 rounded-full border border-border flex items-center justify-center">
          <Mic className="w-5 h-5 text-muted-foreground" />
        </div>
        <div className="text-center space-y-1">
          <p className="text-sm font-medium">No meetings yet</p>
          <p className="text-xs text-muted-foreground">
            Record your first meeting to get started.
          </p>
        </div>
        <Link
          href="/record"
          className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-semibold px-4 py-2 rounded-md transition-colors"
        >
          <Mic className="w-4 h-4" />
          New Meeting
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {meetings.map((meeting) => (
        <MeetingCard key={meeting.id} meeting={meeting} />
      ))}
    </div>
  )
}
