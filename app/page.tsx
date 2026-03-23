import Link from 'next/link'
import { Mic } from 'lucide-react'
import { MeetingList } from '@/components/meeting/MeetingList'

export default function HomePage() {
  return (
    <main className="min-h-screen bg-background animate-page">
      {/* Top bar */}
      <header className="sticky top-0 z-10 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-3xl mx-auto px-6 h-14 flex items-center justify-between">
          <span className="font-mono text-sm tracking-widest text-muted-foreground uppercase select-none">
            IncentTranscript
          </span>
          <Link
            href="/record"
            className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-semibold px-4 py-2 rounded-md transition-colors"
          >
            <Mic className="w-4 h-4" />
            New Meeting
          </Link>
        </div>
      </header>

      {/* Meeting list */}
      <div className="max-w-3xl mx-auto px-6 py-8">
        <MeetingList />
      </div>
    </main>
  )
}
