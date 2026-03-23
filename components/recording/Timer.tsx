'use client'

interface TimerProps {
  duration: number  // seconds
  isPaused: boolean
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) {
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export function Timer({ duration, isPaused }: TimerProps) {
  return (
    <div className="flex flex-col items-center gap-2">
      <span
        className="font-mono text-7xl font-semibold tracking-tight tabular-nums"
        style={{
          color: isPaused ? 'hsl(var(--muted-foreground))' : 'hsl(var(--foreground))',
          transition: 'color 0.2s ease',
        }}
      >
        {formatDuration(duration)}
      </span>
      {isPaused && (
        <span className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
          paused
        </span>
      )}
    </div>
  )
}
