import { create } from 'zustand'
import type { Meeting } from '@/types'
import { getAllMeetings, saveMeeting, deleteMeeting } from '@/lib/db'
import { toast } from '@/components/ui/use-toast'

interface MeetingsState {
  meetings: Meeting[]
  activeRecordingId: string | null
  isLoading: boolean
  loadMeetings: () => Promise<void>
  addMeeting: (meeting: Meeting) => Promise<void>
  updateMeeting: (id: string, updates: Partial<Meeting>) => Promise<void>
  removeMeeting: (id: string) => Promise<void>
  setActiveRecording: (id: string | null) => void
}

export const useMeetingsStore = create<MeetingsState>((set, get) => ({
  meetings: [],
  activeRecordingId: null,
  isLoading: false,

  loadMeetings: async () => {
    set({ isLoading: true })
    try {
      const meetings = await getAllMeetings()
      meetings.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      set({ meetings })
    } catch (err) {
      toast({
        title: 'Failed to load meetings',
        description: err instanceof Error ? err.message : String(err),
        variant: 'destructive',
      })
    } finally {
      set({ isLoading: false })
    }
  },

  addMeeting: async (meeting: Meeting) => {
    try {
      await saveMeeting(meeting)
      set((state) => ({ meetings: [meeting, ...state.meetings] }))
    } catch (err) {
      toast({
        title: 'Failed to save meeting',
        description: err instanceof Error ? err.message : String(err),
        variant: 'destructive',
      })
      throw err
    }
  },

  updateMeeting: async (id: string, updates: Partial<Meeting>) => {
    const existing = get().meetings.find((m) => m.id === id)
    if (!existing) return

    const updated: Meeting = { ...existing, ...updates }
    try {
      await saveMeeting(updated)
      set((state) => ({
        meetings: state.meetings.map((m) => (m.id === id ? updated : m)),
      }))
    } catch (err) {
      toast({
        title: 'Failed to update meeting',
        description: err instanceof Error ? err.message : String(err),
        variant: 'destructive',
      })
      throw err
    }
  },

  removeMeeting: async (id: string) => {
    try {
      await deleteMeeting(id)
      set((state) => ({
        meetings: state.meetings.filter((m) => m.id !== id),
      }))
    } catch (err) {
      toast({
        title: 'Failed to delete meeting',
        description: err instanceof Error ? err.message : String(err),
        variant: 'destructive',
      })
      throw err
    }
  },

  setActiveRecording: (id: string | null) => {
    set({ activeRecordingId: id })
  },
}))
