import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { z } from 'zod'
import type { TranscriptSegment } from '@/types'

const MAX_FILE_SIZE = 25 * 1024 * 1024 // 25 MB

// Whisper verbose_json segment shape (subset we care about)
const WhisperSegmentSchema = z.object({
  start: z.number(),
  end: z.number(),
  text: z.string(),
})

const WhisperResponseSchema = z.object({
  text: z.string(),
  segments: z.array(WhisperSegmentSchema).optional().default([]),
})

interface ErrorResponse {
  error: string
  code: string
}

function errorResponse(message: string, code: string, status: number): NextResponse<ErrorResponse> {
  return NextResponse.json({ error: message, code }, { status })
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  let formData: FormData
  try {
    formData = await req.formData()
  } catch {
    return errorResponse('Invalid multipart/form-data body', 'INVALID_BODY', 400)
  }

  const audioField = formData.get('audio')
  if (!audioField || !(audioField instanceof File)) {
    return errorResponse('Missing required field: audio (File)', 'MISSING_AUDIO', 400)
  }

  if (audioField.size > MAX_FILE_SIZE) {
    return errorResponse(
      `File exceeds the 25 MB Whisper limit (received ${(audioField.size / 1024 / 1024).toFixed(1)} MB). Split the audio before sending.`,
      'FILE_TOO_LARGE',
      400,
    )
  }

  if (audioField.size === 0) {
    return errorResponse('Audio file is empty', 'EMPTY_FILE', 400)
  }

  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    return errorResponse('OpenAI API key is not configured', 'MISSING_API_KEY', 500)
  }

  const openai = new OpenAI({ apiKey })

  let whisperRaw: unknown
  try {
    whisperRaw = await openai.audio.transcriptions.create({
      file: audioField,
      model: 'whisper-1',
      response_format: 'verbose_json',
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return errorResponse(`Whisper API error: ${message}`, 'WHISPER_ERROR', 502)
  }

  const parsed = WhisperResponseSchema.safeParse(whisperRaw)
  if (!parsed.success) {
    return errorResponse('Unexpected Whisper response shape', 'WHISPER_PARSE_ERROR', 502)
  }

  const segments: TranscriptSegment[] = parsed.data.segments.map((s) => ({
    start: s.start,
    end: s.end,
    text: s.text.trim(),
  }))

  return NextResponse.json({
    rawText: parsed.data.text.trim(),
    segments,
  })
}
