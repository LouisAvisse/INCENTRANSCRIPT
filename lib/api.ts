'use client'

import type { Transcript, Analysis } from '@/types'
import { splitAudioBlob } from '@/lib/audio'

const CHUNK_SIZE_MB = 24 // stay under Whisper's 25 MB hard limit

// ─── Typed error ─────────────────────────────────────────────────────────────

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly status: number,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let code = 'UNKNOWN_ERROR'
    let message = `HTTP ${res.status}`
    try {
      const body = (await res.json()) as { error?: string; code?: string }
      if (body.error) message = body.error
      if (body.code) code = body.code
    } catch {
      // response body wasn't JSON — use defaults above
    }
    throw new ApiError(message, code, res.status)
  }
  return res.json() as Promise<T>
}

// ─── transcribeAudio ─────────────────────────────────────────────────────────

interface TranscribeResponse {
  rawText: string
  segments: Transcript['segments']
}

async function transcribeChunk(
  chunk: Blob,
  ext: string,
  chunkIndex: number,
): Promise<TranscribeResponse> {
  const formData = new FormData()
  formData.append('audio', chunk, `recording-part${chunkIndex}.${ext}`)

  const res = await fetch('/api/transcribe', {
    method: 'POST',
    body: formData,
  })

  return handleResponse<TranscribeResponse>(res)
}

/**
 * Transcribes an audio blob, splitting it into ≤24 MB chunks if needed.
 * Segments from subsequent chunks have their timestamps offset by the
 * proportional byte position × totalDurationSeconds (best-effort estimate).
 */
export async function transcribeAudio(
  audioBlob: Blob,
  meetingId: string,
  totalDurationSeconds = 0,
): Promise<Transcript> {
  const ext = audioBlob.type.includes('mp4') ? 'mp4' : 'webm'
  const chunks = splitAudioBlob(audioBlob, CHUNK_SIZE_MB)

  if (chunks.length === 1) {
    const data = await transcribeChunk(chunks[0], ext, 0)
    return { meetingId, rawText: data.rawText, segments: data.segments }
  }

  // Multi-chunk: transcribe sequentially, offset timestamps by byte proportion
  const results: TranscribeResponse[] = []
  for (let i = 0; i < chunks.length; i++) {
    const result = await transcribeChunk(chunks[i], ext, i)
    results.push(result)
  }

  let rawText = ''
  const segments: Transcript['segments'] = []
  let byteOffset = 0

  for (let i = 0; i < results.length; i++) {
    const result = results[i]
    const chunkSize = chunks[i].size
    const timeOffset =
      totalDurationSeconds > 0
        ? (byteOffset / audioBlob.size) * totalDurationSeconds
        : 0

    if (rawText) rawText += ' '
    rawText += result.rawText

    for (const seg of result.segments) {
      segments.push({
        start: seg.start + timeOffset,
        end: seg.end + timeOffset,
        text: seg.text,
      })
    }

    byteOffset += chunkSize
  }

  return { meetingId, rawText, segments }
}

// ─── analyzeTranscript ───────────────────────────────────────────────────────

export async function analyzeTranscript(
  transcript: Transcript,
  meetingId: string,
): Promise<Analysis> {
  const res = await fetch('/api/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      transcript: transcript.rawText,
      meetingId,
    }),
  })

  return handleResponse<Analysis>(res)
}
