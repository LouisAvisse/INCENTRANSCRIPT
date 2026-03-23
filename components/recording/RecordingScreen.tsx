'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { Mic, Pause, Play, Square } from 'lucide-react'
import { useRecorder, useWaveform } from '@/lib/audio'
import { useMeetingsStore } from '@/store/meetings'
import { Waveform } from './Waveform'
import { Timer } from './Timer'
import type { Meeting } from '@/types'

function generateId(): string {
  return crypto.randomUUID()
}

function generateTitle(): string {
  // "Meeting · Mon 23 Mar · 14:30"
  return `Meeting · ${format(new Date(), 'EEE d MMM · HH:mm')}`
}

type RecordingPhase = 'idle' | 'recording' | 'paused'

export function RecordingScreen() {
  const router = useRouter()
  const { addMeeting } = useMeetingsStore()
  const [phase, setPhase] = useState<RecordingPhase>('idle')
  const [isStopping, setIsStopping] = useState(false)

  const {
    isPaused,
    duration,
    stream,
    startRecording,
    pauseRecording,
    resumeRecording,
    stopRecording,
  } = useRecorder()

  const { waveformData } = useWaveform(stream)

  const handleStart = useCallback(async () => {
    await startRecording()
    setPhase('recording')
  }, [startRecording])

  const handlePause = useCallback(() => {
    pauseRecording()
    setPhase('paused')
  }, [pauseRecording])

  const handleResume = useCallback(() => {
    resumeRecording()
    setPhase('recording')
  }, [resumeRecording])

  const handleStop = useCallback(async () => {
    setIsStopping(true)
    try {
      const blob = await stopRecording()
      const id = generateId()
      const audioUrl = URL.createObjectURL(blob)

      const meeting: Meeting = {
        id,
        title: generateTitle(),
        createdAt: new Date(),
        duration,
        audioBlob: blob,
        audioUrl,
        status: 'recorded',
      }

      await addMeeting(meeting)
      router.push(`/meetings/${id}`)
    } catch {
      setIsStopping(false)
      setPhase('recording')
    }
  }, [stopRecording, duration, addMeeting, router])

  // ── Space shortcut ──────────────────────────────────────────────────────────
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      // Don't steal Space from inputs/textareas
      const tag = (e.target as HTMLElement).tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'BUTTON') return
      if (e.code !== 'Space') return
      e.preventDefault()

      if (isStopping) return

      if (phase === 'idle') {
        handleStart()
      } else if (phase === 'recording') {
        handlePause()
      } else if (phase === 'paused') {
        handleResume()
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [phase, isStopping, handleStart, handlePause, handleResume])

  const isActive = phase === 'recording'

  return (
    <div className="fixed inset-0 bg-background flex flex-col items-center justify-between py-12 sm:py-16 px-6">
      {/* Header */}
      <div className="flex items-center gap-2 text-muted-foreground text-sm font-mono tracking-wide">
        {isActive && (
          <span className="inline-block w-2 h-2 rounded-full bg-red-500 animate-pulse" />
        )}
        <span>
          {isStopping ? 'saving…' : phase === 'idle' ? 'ready' : phase === 'recording' ? 'recording' : 'paused'}
        </span>
      </div>

      {/* Waveform — hero */}
      <div className="w-full max-w-2xl flex-1 flex items-center px-2 sm:px-4" style={{ maxHeight: '40vh' }}>
        <div className="w-full h-32 sm:h-40">
          <Waveform data={waveformData} isActive={isActive} />
        </div>
      </div>

      {/* Timer */}
      <Timer duration={duration} isPaused={isPaused} />

      {/* Controls */}
      <div className="flex items-center gap-8 sm:gap-6 mt-8">
        {phase === 'idle' && (
          <button
            onClick={handleStart}
            className="w-16 h-16 sm:w-16 sm:h-16 rounded-full bg-red-500 hover:bg-red-400 active:scale-95 flex items-center justify-center transition-all shadow-lg shadow-red-500/20"
            aria-label="Start recording (Space)"
          >
            <Mic className="w-7 h-7 text-white" />
          </button>
        )}

        {(phase === 'recording' || phase === 'paused') && (
          <>
            {phase === 'recording' ? (
              <button
                onClick={handlePause}
                className="w-14 h-14 sm:w-12 sm:h-12 rounded-full border border-border hover:border-foreground/40 active:scale-95 flex items-center justify-center transition-all"
                aria-label="Pause recording (Space)"
              >
                <Pause className="w-5 h-5 text-foreground" />
              </button>
            ) : (
              <button
                onClick={handleResume}
                className="w-14 h-14 sm:w-12 sm:h-12 rounded-full border border-border hover:border-foreground/40 active:scale-95 flex items-center justify-center transition-all"
                aria-label="Resume recording (Space)"
              >
                <Play className="w-5 h-5 text-foreground" />
              </button>
            )}

            <div
              className="w-4 h-4 rounded-full bg-red-500 transition-opacity"
              style={{ opacity: isActive ? 1 : 0.3 }}
            />

            <button
              onClick={handleStop}
              disabled={isStopping}
              className="w-14 h-14 sm:w-12 sm:h-12 rounded-full border border-border hover:border-foreground/40 active:scale-95 flex items-center justify-center transition-all disabled:opacity-40"
              aria-label="Stop recording"
            >
              <Square className="w-5 h-5 text-foreground" fill="currentColor" />
            </button>
          </>
        )}
      </div>

      {/* Hint */}
      {phase === 'idle' && (
        <p className="text-muted-foreground text-xs font-mono mt-4">
          tap or press <kbd className="px-1 py-0.5 border border-border rounded text-[10px]">Space</kbd> to start
        </p>
      )}
    </div>
  )
}
