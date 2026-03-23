'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { ArrowLeft, Loader2, FileText, Sparkles, Download, Copy, MoreHorizontal, RefreshCw } from 'lucide-react'
import Link from 'next/link'

import { getMeeting, getTranscript, getAnalysis, saveTranscript, saveAnalysis } from '@/lib/db'
import { transcribeAudio, analyzeTranscript } from '@/lib/api'
import { useMeetingsStore } from '@/store/meetings'
import { toast } from '@/components/ui/use-toast'

import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { MeetingPlayer } from '@/components/meeting/MeetingPlayer'
import { TranscriptView } from '@/components/transcript/TranscriptView'
import { TopicList } from '@/components/transcript/TopicList'
import { ActionItemList } from '@/components/transcript/ActionItemList'

import type { Meeting, Transcript, Analysis } from '@/types'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function formatTimestamp(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  if (h > 0) {
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function buildMarkdown(meeting: Meeting, transcript: Transcript | null, analysis: Analysis | null): string {
  const lines: string[] = []

  lines.push(`# ${meeting.title}`)
  lines.push('')
  lines.push(`**Date:** ${format(new Date(meeting.createdAt), 'PPP · HH:mm')}`)
  if (meeting.duration > 0) {
    lines.push(`**Duration:** ${formatDuration(meeting.duration)}`)
  }
  lines.push('')

  if (analysis) {
    lines.push('## Summary')
    lines.push('')
    lines.push(analysis.summary)
    lines.push('')

    if (analysis.topics.length > 0) {
      lines.push('## Topics')
      lines.push('')
      for (const topic of analysis.topics) {
        lines.push(`### ${topic.title} (${formatTimestamp(topic.startTime)} → ${formatTimestamp(topic.endTime)})`)
        lines.push('')
        lines.push(topic.summary)
        if (topic.keywords.length > 0) {
          lines.push('')
          lines.push(`**Keywords:** ${topic.keywords.join(', ')}`)
        }
        lines.push('')
      }
    }

    if (analysis.actionItems.length > 0) {
      lines.push('## Action Items')
      lines.push('')
      for (const item of analysis.actionItems) {
        lines.push(`- [ ] ${item.text}`)
      }
      lines.push('')
    }
  }

  if (transcript) {
    lines.push('## Transcript')
    lines.push('')
    if (transcript.segments.length > 0) {
      for (const seg of transcript.segments) {
        lines.push(`[${formatTimestamp(seg.start)}] ${seg.text}`)
      }
    } else {
      lines.push(transcript.rawText)
    }
  }

  return lines.join('\n')
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function slugify(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

// ─── Status badge ─────────────────────────────────────────────────────────────

function StatusDot({ status }: { status: Meeting['status'] }) {
  const configs: Record<Meeting['status'], { label: string; color: string }> = {
    recording: { label: 'recording', color: 'text-amber-400' },
    recorded:  { label: 'recorded',  color: 'text-zinc-400'  },
    transcribing: { label: 'transcribing', color: 'text-blue-400' },
    analyzed:  { label: 'analyzed',  color: 'text-emerald-400' },
    error:     { label: 'error',     color: 'text-red-400'   },
  }
  const { label, color } = configs[status]
  return <span className={`font-mono text-xs ${color}`}>{label}</span>
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function MeetingPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const { updateMeeting } = useMeetingsStore()

  const [meeting, setMeeting]       = useState<Meeting | null>(null)
  const [transcript, setTranscript] = useState<Transcript | null>(null)
  const [analysis, setAnalysis]     = useState<Analysis | null>(null)
  const [isLoading, setIsLoading]   = useState(true)

  const [isTranscribing, setIsTranscribing] = useState(false)
  const [isAnalyzing, setIsAnalyzing]       = useState(false)

  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [titleDraft, setTitleDraft]         = useState('')
  const titleInputRef = useRef<HTMLInputElement>(null)

  // ── Load ──────────────────────────────────────────────────────────────────

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const [m, t, a] = await Promise.all([getMeeting(id), getTranscript(id), getAnalysis(id)])
        if (cancelled) return
        if (!m) { router.replace('/'); return }
        if (m.audioBlob && !m.audioUrl) {
          m.audioUrl = URL.createObjectURL(m.audioBlob)
        }
        setMeeting(m)
        setTitleDraft(m.title)
        if (t) setTranscript(t)
        if (a) setAnalysis(a)
      } catch (err) {
        if (!cancelled) {
          toast({ title: 'Failed to load meeting', description: String(err), variant: 'destructive' })
        }
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [id, router])

  useEffect(() => {
    if (isEditingTitle) titleInputRef.current?.focus()
  }, [isEditingTitle])

  // ── Title edit ────────────────────────────────────────────────────────────

  const commitTitle = async () => {
    setIsEditingTitle(false)
    const trimmed = titleDraft.trim()
    if (!trimmed || !meeting || trimmed === meeting.title) return
    const updated = { ...meeting, title: trimmed }
    setMeeting(updated)
    await updateMeeting(id, { title: trimmed })
  }

  // ── Transcribe ────────────────────────────────────────────────────────────

  const handleTranscribe = async () => {
    if (!meeting?.audioBlob) {
      toast({ title: 'No audio found', description: 'Audio blob is missing from local storage.', variant: 'destructive' })
      return
    }
    setIsTranscribing(true)
    const inProgress = { ...meeting, status: 'transcribing' as const }
    setMeeting(inProgress)
    await updateMeeting(id, { status: 'transcribing' })

    try {
      const result = await transcribeAudio(meeting.audioBlob, id, meeting.duration)
      await saveTranscript(result)
      setTranscript(result)
      const done = { ...inProgress, status: 'recorded' as const }
      setMeeting(done)
      await updateMeeting(id, { status: 'recorded' })
      toast({ title: 'Transcription complete' })
    } catch (err) {
      const errMeeting = { ...meeting, status: 'error' as const }
      setMeeting(errMeeting)
      await updateMeeting(id, { status: 'error' })
      toast({
        title: 'Transcription failed',
        description: err instanceof Error ? err.message : String(err),
        variant: 'destructive',
      })
    } finally {
      setIsTranscribing(false)
    }
  }

  // ── Analyze ───────────────────────────────────────────────────────────────

  const handleAnalyze = async () => {
    if (!transcript) {
      toast({ title: 'No transcript found', variant: 'destructive' })
      return
    }
    setIsAnalyzing(true)
    try {
      const result = await analyzeTranscript(transcript, id)
      await saveAnalysis(result)
      setAnalysis(result)
      const done = { ...meeting!, status: 'analyzed' as const }
      setMeeting(done)
      await updateMeeting(id, { status: 'analyzed' })
      toast({ title: 'Analysis complete' })
    } catch (err) {
      // Analysis failure intentionally does NOT change meeting status — transcript is preserved
      toast({
        title: 'Analysis failed',
        description: err instanceof Error ? err.message : String(err),
        variant: 'destructive',
      })
    } finally {
      setIsAnalyzing(false)
    }
  }

  // ── Export ────────────────────────────────────────────────────────────────

  const handleCopyTranscript = async () => {
    if (!transcript) return
    await navigator.clipboard.writeText(transcript.rawText)
    toast({ title: 'Transcript copied to clipboard' })
  }

  const handleDownloadMarkdown = () => {
    if (!meeting) return
    const md = buildMarkdown(meeting, transcript, analysis)
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' })
    downloadBlob(blob, `${slugify(meeting.title)}.md`)
  }

  const handleDownloadAudio = () => {
    if (!meeting?.audioBlob && !meeting?.audioUrl) {
      toast({ title: 'Audio not available', variant: 'destructive' })
      return
    }
    const ext = meeting.audioBlob?.type.includes('mp4') ? 'mp4' : 'webm'
    if (meeting.audioBlob) {
      downloadBlob(meeting.audioBlob, `${slugify(meeting.title)}.${ext}`)
    } else if (meeting.audioUrl) {
      const a = document.createElement('a')
      a.href = meeting.audioUrl
      a.download = `${slugify(meeting.title)}.${ext}`
      a.click()
    }
  }

  // ── Skeleton ──────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <main className="min-h-screen bg-background animate-page">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-6">
          <Skeleton className="h-5 w-24" />
          <div className="space-y-2">
            <Skeleton className="h-8 w-2/3" />
            <Skeleton className="h-4 w-48" />
          </div>
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </main>
    )
  }

  if (!meeting) return null

  const canTranscribe =
    (meeting.status === 'recorded' || meeting.status === 'error') && !!meeting.audioBlob
  const isRetry = meeting.status === 'error'
  const canAnalyze = !!transcript && meeting.status !== 'analyzed' && !isAnalyzing
  const hasExportContent = !!transcript || !!analysis

  return (
    <main className="min-h-screen bg-background animate-page">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-6 sm:space-y-8">

        {/* Back nav */}
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors font-mono"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          meetings
        </Link>

        {/* Header row */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0 space-y-2">
            {isEditingTitle ? (
              <input
                ref={titleInputRef}
                value={titleDraft}
                onChange={(e) => setTitleDraft(e.target.value)}
                onBlur={commitTitle}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') commitTitle()
                  if (e.key === 'Escape') { setTitleDraft(meeting.title); setIsEditingTitle(false) }
                }}
                className="w-full bg-transparent border-b border-primary text-lg sm:text-xl font-semibold outline-none pb-0.5"
              />
            ) : (
              <h1
                onClick={() => setIsEditingTitle(true)}
                className="text-lg sm:text-xl font-semibold cursor-text hover:text-primary transition-colors"
                title="Click to rename"
              >
                {meeting.title}
              </h1>
            )}

            <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs text-muted-foreground font-mono">
              <span>{format(new Date(meeting.createdAt), 'MMM d, yyyy · HH:mm')}</span>
              {meeting.duration > 0 && (
                <>
                  <span className="hidden sm:inline">·</span>
                  <span>{formatDuration(meeting.duration)}</span>
                </>
              )}
              <span>·</span>
              <StatusDot status={meeting.status} />
            </div>
          </div>

          {/* Export dropdown */}
          {hasExportContent && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="shrink-0 w-9 h-9 rounded-md border border-border hover:border-foreground/40 flex items-center justify-center transition-colors"
                  aria-label="Export options"
                >
                  <MoreHorizontal className="w-4 h-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Export</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {transcript && (
                  <DropdownMenuItem onClick={handleCopyTranscript}>
                    <Copy className="w-4 h-4" />
                    Copy transcript
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={handleDownloadMarkdown}>
                  <Download className="w-4 h-4" />
                  Download .md
                </DropdownMenuItem>
                {(meeting.audioBlob ?? meeting.audioUrl) && (
                  <DropdownMenuItem onClick={handleDownloadAudio}>
                    <Download className="w-4 h-4" />
                    Download audio
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {/* Error callout with retry */}
        {meeting.status === 'error' && (
          <div className="flex items-center justify-between gap-4 border border-red-500/30 bg-red-500/5 rounded-md px-4 py-3">
            <p className="text-sm text-red-400 font-mono">
              Transcription failed. Check your API key and try again.
            </p>
            {meeting.audioBlob && (
              <button
                onClick={handleTranscribe}
                disabled={isTranscribing}
                className="shrink-0 flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300 border border-red-500/40 hover:border-red-400/60 px-3 py-1.5 rounded-md transition-colors disabled:opacity-50"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Retry
              </button>
            )}
          </div>
        )}

        {/* Audio player */}
        {meeting.audioUrl && (
          <div className="w-full">
            <MeetingPlayer audioUrl={meeting.audioUrl} />
          </div>
        )}

        {/* Action buttons */}
        <div className="flex flex-wrap gap-3">
          {canTranscribe && meeting.status !== 'error' && (
            <button
              onClick={handleTranscribe}
              disabled={isTranscribing}
              className="flex items-center gap-2 border border-border hover:border-foreground/40 text-sm px-4 py-2.5 sm:py-2 rounded-md transition-colors disabled:opacity-50 min-h-[44px] sm:min-h-0"
            >
              {isTranscribing ? (
                <><Loader2 className="w-4 h-4 animate-spin" />Transcribing…</>
              ) : (
                <><FileText className="w-4 h-4" />Transcribe</>
              )}
            </button>
          )}

          {canAnalyze && (
            <button
              onClick={handleAnalyze}
              disabled={isAnalyzing}
              className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-medium px-4 py-2.5 sm:py-2 rounded-md transition-colors disabled:opacity-50 min-h-[44px] sm:min-h-0"
            >
              {isAnalyzing ? (
                <><Loader2 className="w-4 h-4 animate-spin" />Analyzing…</>
              ) : (
                <><Sparkles className="w-4 h-4" />Analyze</>
              )}
            </button>
          )}
        </div>

        {/* Tabs */}
        <Tabs defaultValue={analysis ? 'summary' : transcript ? 'transcript' : 'summary'}>
          <TabsList>
            <TabsTrigger value="summary">Summary</TabsTrigger>
            <TabsTrigger value="topics">Topics</TabsTrigger>
            <TabsTrigger value="actions">Actions</TabsTrigger>
            <TabsTrigger value="transcript">Transcript</TabsTrigger>
          </TabsList>

          <TabsContent value="summary">
            {analysis ? (
              <p className="text-sm leading-relaxed text-foreground/90">{analysis.summary}</p>
            ) : (
              <p className="text-sm text-muted-foreground font-mono">
                {transcript ? 'Run "Analyze" to generate a summary.' : 'Transcribe the meeting first.'}
              </p>
            )}
          </TabsContent>

          <TabsContent value="topics">
            {analysis ? (
              <TopicList topics={analysis.topics} />
            ) : (
              <p className="text-sm text-muted-foreground font-mono">
                {transcript ? 'Run "Analyze" to identify topics.' : 'Transcribe the meeting first.'}
              </p>
            )}
          </TabsContent>

          <TabsContent value="actions">
            {analysis ? (
              <ActionItemList actionItems={analysis.actionItems} topics={analysis.topics} />
            ) : (
              <p className="text-sm text-muted-foreground font-mono">
                {transcript ? 'Run "Analyze" to extract action items.' : 'Transcribe the meeting first.'}
              </p>
            )}
          </TabsContent>

          <TabsContent value="transcript">
            {transcript ? (
              <TranscriptView segments={transcript.segments} rawText={transcript.rawText} />
            ) : (
              <p className="text-sm text-muted-foreground font-mono">
                No transcript yet. Use the &quot;Transcribe&quot; button above.
              </p>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </main>
  )
}
