import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { z } from 'zod'
import type { Analysis } from '@/types'

// ─── Input validation ────────────────────────────────────────────────────────

const BodySchema = z.object({
  transcript: z.string().min(1, 'transcript must be a non-empty string'),
  meetingId: z.string().min(1, 'meetingId must be a non-empty string'),
})

// ─── Claude response shape validation ───────────────────────────────────────

const TopicSchema = z.object({
  id: z.string(),
  title: z.string(),
  summary: z.string(),
  startTime: z.number(),
  endTime: z.number(),
  keywords: z.array(z.string()),
})

const ActionItemSchema = z.object({
  id: z.string(),
  text: z.string(),
  topicId: z.string().nullable().optional(),
})

const AnalysisResponseSchema = z.object({
  summary: z.string(),
  topics: z.array(TopicSchema),
  actionItems: z.array(ActionItemSchema),
})

// ─── Helpers ─────────────────────────────────────────────────────────────────

function stripMarkdownFences(text: string): string {
  // Remove ```json ... ``` or ``` ... ``` wrappers if Claude adds them
  return text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()
}

interface ErrorResponse {
  error: string
  code: string
}

function errorResponse(message: string, code: string, status: number): NextResponse<ErrorResponse> {
  return NextResponse.json({ error: message, code }, { status })
}

// ─── System prompt ───────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are a meeting analysis assistant. You receive a raw meeting transcript and return a structured JSON analysis. Your output must be valid JSON only, with no preamble or markdown code blocks.

Return this exact structure:
{
  "summary": "One paragraph summary of the meeting",
  "topics": [
    {
      "id": "uuid",
      "title": "Topic title",
      "summary": "2-3 sentence summary",
      "startTime": 0,
      "endTime": 0,
      "keywords": ["keyword1", "keyword2"]
    }
  ],
  "actionItems": [
    {
      "id": "uuid",
      "text": "Action item description",
      "topicId": "related topic id or null"
    }
  ]
}

startTime and endTime for topics should be estimated in seconds based on position in transcript (0 = start).
Extract all clear action items. If none, return empty array.`

// ─── Route handler ───────────────────────────────────────────────────────────

export async function POST(req: NextRequest): Promise<NextResponse> {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return errorResponse('Invalid JSON body', 'INVALID_BODY', 400)
  }

  const validation = BodySchema.safeParse(body)
  if (!validation.success) {
    const message = validation.error.errors.map((e) => e.message).join('; ')
    return errorResponse(message, 'VALIDATION_ERROR', 400)
  }

  const { transcript, meetingId } = validation.data

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return errorResponse('Anthropic API key is not configured', 'MISSING_API_KEY', 500)
  }

  const client = new Anthropic({ apiKey })

  let rawContent: string
  try {
    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: transcript,
        },
      ],
    })

    const firstBlock = message.content[0]
    if (!firstBlock || firstBlock.type !== 'text') {
      return errorResponse('Claude returned no text content', 'CLAUDE_EMPTY_RESPONSE', 502)
    }
    rawContent = firstBlock.text
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return errorResponse(`Claude API error: ${message}`, 'CLAUDE_ERROR', 502)
  }

  const cleaned = stripMarkdownFences(rawContent)

  let parsed: unknown
  try {
    parsed = JSON.parse(cleaned)
  } catch {
    return errorResponse('Claude returned invalid JSON', 'CLAUDE_JSON_PARSE_ERROR', 502)
  }

  const validated = AnalysisResponseSchema.safeParse(parsed)
  if (!validated.success) {
    return errorResponse('Claude response did not match expected schema', 'CLAUDE_SCHEMA_ERROR', 502)
  }

  const analysis: Analysis = {
    meetingId,
    summary: validated.data.summary,
    topics: validated.data.topics,
    actionItems: validated.data.actionItems.map((item) => ({
      id: item.id,
      text: item.text,
      ...(item.topicId != null ? { topicId: item.topicId } : {}),
    })),
  }

  return NextResponse.json(analysis)
}
