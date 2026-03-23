'use client'

import { useEffect, useRef, useState } from 'react'
import { Play, Pause } from 'lucide-react'

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

interface MeetingPlayerProps {
  audioUrl: string
}

export function MeetingPlayer({ audioUrl }: MeetingPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)

  useEffect(() => {
    const el = audioRef.current
    if (!el) return

    const onTimeUpdate = () => setCurrentTime(el.currentTime)
    const onDurationChange = () => setDuration(el.duration || 0)
    const onEnded = () => setIsPlaying(false)

    el.addEventListener('timeupdate', onTimeUpdate)
    el.addEventListener('durationchange', onDurationChange)
    el.addEventListener('loadedmetadata', onDurationChange)
    el.addEventListener('ended', onEnded)

    return () => {
      el.removeEventListener('timeupdate', onTimeUpdate)
      el.removeEventListener('durationchange', onDurationChange)
      el.removeEventListener('loadedmetadata', onDurationChange)
      el.removeEventListener('ended', onEnded)
    }
  }, [])

  const togglePlay = () => {
    const el = audioRef.current
    if (!el) return
    if (isPlaying) {
      el.pause()
      setIsPlaying(false)
    } else {
      el.play()
      setIsPlaying(true)
    }
  }

  const handleScrub = (e: React.ChangeEvent<HTMLInputElement>) => {
    const el = audioRef.current
    if (!el) return
    const value = Number(e.target.value)
    el.currentTime = value
    setCurrentTime(value)
  }

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0

  return (
    <div className="flex items-center gap-4 bg-card border border-border rounded-md px-4 py-3">
      <audio ref={audioRef} src={audioUrl} preload="metadata" />

      <button
        onClick={togglePlay}
        className="shrink-0 w-8 h-8 rounded-full border border-border hover:border-foreground/40 flex items-center justify-center transition-colors"
        aria-label={isPlaying ? 'Pause' : 'Play'}
      >
        {isPlaying ? (
          <Pause className="w-3.5 h-3.5" />
        ) : (
          <Play className="w-3.5 h-3.5 ml-0.5" />
        )}
      </button>

      <span className="font-mono text-xs text-muted-foreground tabular-nums w-10 shrink-0">
        {formatTime(currentTime)}
      </span>

      {/* Scrubber */}
      <div className="flex-1 relative h-1 group">
        <div className="absolute inset-y-0 left-0 right-0 my-auto h-1 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-none"
            style={{ width: `${progress}%` }}
          />
        </div>
        <input
          type="range"
          min={0}
          max={duration || 0}
          step={0.1}
          value={currentTime}
          onChange={handleScrub}
          className="absolute inset-0 w-full opacity-0 cursor-pointer h-full"
          aria-label="Seek"
        />
      </div>

      <span className="font-mono text-xs text-muted-foreground tabular-nums w-10 shrink-0 text-right">
        {formatTime(duration)}
      </span>
    </div>
  )
}
