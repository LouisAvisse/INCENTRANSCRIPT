export interface Meeting {
  id: string
  title: string
  createdAt: Date
  duration: number
  audioBlob?: Blob
  audioUrl?: string
  status: 'recording' | 'recorded' | 'transcribing' | 'analyzed' | 'error'
}

export interface TranscriptSegment {
  start: number
  end: number
  text: string
}

export interface Transcript {
  meetingId: string
  rawText: string
  segments: TranscriptSegment[]
}

export interface Topic {
  id: string
  title: string
  summary: string
  startTime: number
  endTime: number
  keywords: string[]
}

export interface ActionItem {
  id: string
  text: string
  topicId?: string
}

export interface Analysis {
  meetingId: string
  summary: string
  topics: Topic[]
  actionItems: ActionItem[]
}
