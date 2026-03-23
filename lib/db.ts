import { openDB, type IDBPDatabase } from 'idb'
import type { Meeting, Transcript, Analysis } from '@/types'

interface TranscriptAppDB {
  meetings: {
    key: string
    value: Meeting
  }
  transcripts: {
    key: string
    value: Transcript
  }
  analyses: {
    key: string
    value: Analysis
  }
}

const DB_NAME = 'transcript-app'
const DB_VERSION = 1

let dbPromise: Promise<IDBPDatabase<TranscriptAppDB>> | null = null

function getDB(): Promise<IDBPDatabase<TranscriptAppDB>> {
  if (!dbPromise) {
    dbPromise = openDB<TranscriptAppDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('meetings')) {
          db.createObjectStore('meetings', { keyPath: 'id' })
        }
        if (!db.objectStoreNames.contains('transcripts')) {
          db.createObjectStore('transcripts', { keyPath: 'meetingId' })
        }
        if (!db.objectStoreNames.contains('analyses')) {
          db.createObjectStore('analyses', { keyPath: 'meetingId' })
        }
      },
    })
  }
  return dbPromise
}

export async function saveMeeting(meeting: Meeting): Promise<void> {
  try {
    const db = await getDB()
    await db.put('meetings', meeting)
  } catch (err) {
    throw new Error(`Failed to save meeting: ${err instanceof Error ? err.message : String(err)}`)
  }
}

export async function getMeeting(id: string): Promise<Meeting | undefined> {
  try {
    const db = await getDB()
    return await db.get('meetings', id)
  } catch (err) {
    throw new Error(`Failed to get meeting: ${err instanceof Error ? err.message : String(err)}`)
  }
}

export async function getAllMeetings(): Promise<Meeting[]> {
  try {
    const db = await getDB()
    return await db.getAll('meetings')
  } catch (err) {
    throw new Error(`Failed to get all meetings: ${err instanceof Error ? err.message : String(err)}`)
  }
}

export async function deleteMeeting(id: string): Promise<void> {
  try {
    const db = await getDB()
    await db.delete('meetings', id)
  } catch (err) {
    throw new Error(`Failed to delete meeting: ${err instanceof Error ? err.message : String(err)}`)
  }
}

export async function saveTranscript(transcript: Transcript): Promise<void> {
  try {
    const db = await getDB()
    await db.put('transcripts', transcript)
  } catch (err) {
    throw new Error(`Failed to save transcript: ${err instanceof Error ? err.message : String(err)}`)
  }
}

export async function getTranscript(meetingId: string): Promise<Transcript | undefined> {
  try {
    const db = await getDB()
    return await db.get('transcripts', meetingId)
  } catch (err) {
    throw new Error(`Failed to get transcript: ${err instanceof Error ? err.message : String(err)}`)
  }
}

export async function saveAnalysis(analysis: Analysis): Promise<void> {
  try {
    const db = await getDB()
    await db.put('analyses', analysis)
  } catch (err) {
    throw new Error(`Failed to save analysis: ${err instanceof Error ? err.message : String(err)}`)
  }
}

export async function getAnalysis(meetingId: string): Promise<Analysis | undefined> {
  try {
    const db = await getDB()
    return await db.get('analyses', meetingId)
  } catch (err) {
    throw new Error(`Failed to get analysis: ${err instanceof Error ? err.message : String(err)}`)
  }
}
