'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

// ─── Format detection ────────────────────────────────────────────────────────

function getSupportedMimeType(): string {
  const candidates = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/mp4',
    'audio/ogg;codecs=opus',
  ]
  for (const type of candidates) {
    if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(type)) {
      return type
    }
  }
  return ''
}

// ─── useRecorder ─────────────────────────────────────────────────────────────

export interface RecorderState {
  isRecording: boolean
  isPaused: boolean
  duration: number
  audioBlob: Blob | null
  stream: MediaStream | null
  startRecording: () => Promise<void>
  pauseRecording: () => void
  resumeRecording: () => void
  stopRecording: () => Promise<Blob>
}

export function useRecorder(): RecorderState {
  const [isRecording, setIsRecording] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [duration, setDuration] = useState(0)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [stream, setStream] = useState<MediaStream | null>(null)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const mimeTypeRef = useRef<string>('')

  // Resolve the stop promise externally
  const stopResolveRef = useRef<((blob: Blob) => void) | null>(null)

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }, [])

  const startTimer = useCallback(() => {
    timerRef.current = setInterval(() => {
      setDuration((d) => d + 1)
    }, 1000)
  }, [])

  const startRecording = useCallback(async () => {
    chunksRef.current = []
    setAudioBlob(null)
    setDuration(0)

    const mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true })
    setStream(mediaStream)

    const mimeType = getSupportedMimeType()
    mimeTypeRef.current = mimeType

    const recorder = new MediaRecorder(mediaStream, mimeType ? { mimeType } : undefined)
    mediaRecorderRef.current = recorder

    recorder.ondataavailable = (e: BlobEvent) => {
      if (e.data.size > 0) {
        chunksRef.current.push(e.data)
      }
    }

    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, {
        type: mimeTypeRef.current || 'audio/webm',
      })
      setAudioBlob(blob)
      stopResolveRef.current?.(blob)
      stopResolveRef.current = null

      mediaStream.getTracks().forEach((track) => track.stop())
      setStream(null)
    }

    // Request data every 30s as safety-net auto-save
    recorder.start(30_000)
    setIsRecording(true)
    setIsPaused(false)
    startTimer()
  }, [startTimer])

  const pauseRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.pause()
      setIsPaused(true)
      clearTimer()
    }
  }, [clearTimer])

  const resumeRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === 'paused') {
      mediaRecorderRef.current.resume()
      setIsPaused(false)
      startTimer()
    }
  }, [startTimer])

  const stopRecording = useCallback((): Promise<Blob> => {
    return new Promise<Blob>((resolve) => {
      stopResolveRef.current = resolve
      clearTimer()
      setIsRecording(false)
      setIsPaused(false)
      mediaRecorderRef.current?.stop()
    })
  }, [clearTimer])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearTimer()
      if (mediaRecorderRef.current?.state !== 'inactive') {
        mediaRecorderRef.current?.stop()
      }
    }
  }, [clearTimer])

  return {
    isRecording,
    isPaused,
    duration,
    audioBlob,
    stream,
    startRecording,
    pauseRecording,
    resumeRecording,
    stopRecording,
  }
}

// ─── splitAudioBlob ──────────────────────────────────────────────────────────

/**
 * Splits a Blob into chunks no larger than maxSizeMB.
 * Each slice preserves the original MIME type so Whisper can identify the format.
 * Byte-level splitting is acceptable for transcription — audio parsers handle
 * incomplete container boundaries gracefully enough for speech recognition.
 */
export function splitAudioBlob(blob: Blob, maxSizeMB: number): Blob[] {
  const maxBytes = maxSizeMB * 1024 * 1024
  if (blob.size <= maxBytes) return [blob]

  const chunks: Blob[] = []
  let offset = 0
  while (offset < blob.size) {
    chunks.push(blob.slice(offset, offset + maxBytes, blob.type))
    offset += maxBytes
  }
  return chunks
}

// ─── useWaveform ─────────────────────────────────────────────────────────────

export interface WaveformState {
  waveformData: Uint8Array
}

export function useWaveform(stream: MediaStream | null): WaveformState {
  const [waveformData, setWaveformData] = useState<Uint8Array>(new Uint8Array(128))
  const rafRef = useRef<number | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)

  useEffect(() => {
    if (!stream) {
      setWaveformData(new Uint8Array(128))
      return
    }

    const audioCtx = new AudioContext()
    audioCtxRef.current = audioCtx

    const analyser = audioCtx.createAnalyser()
    analyser.fftSize = 256
    analyserRef.current = analyser

    const source = audioCtx.createMediaStreamSource(stream)
    source.connect(analyser)

    const dataArray = new Uint8Array(analyser.frequencyBinCount)

    const tick = () => {
      analyser.getByteFrequencyData(dataArray)
      setWaveformData(new Uint8Array(dataArray))
      rafRef.current = requestAnimationFrame(tick)
    }

    rafRef.current = requestAnimationFrame(tick)

    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = null
      }
      analyser.disconnect()
      source.disconnect()
      audioCtx.close()
    }
  }, [stream])

  return { waveformData }
}
