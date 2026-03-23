'use client'

import { useState, useCallback } from 'react'

export interface ToastData {
  id: string
  title: string
  description?: string
  variant?: 'default' | 'destructive'
}

// Module-level listeners so toasts can be triggered from anywhere
type Listener = (toasts: ToastData[]) => void
let listeners: Listener[] = []
let toasts: ToastData[] = []

function dispatch(next: ToastData[]) {
  toasts = next
  listeners.forEach((l) => l(toasts))
}

export function toast(data: Omit<ToastData, 'id'>) {
  const id = crypto.randomUUID()
  dispatch([...toasts, { ...data, id }])
  // Auto-dismiss after 5s
  setTimeout(() => {
    dispatch(toasts.filter((t) => t.id !== id))
  }, 5000)
}

export function useToast() {
  const [items, setItems] = useState<ToastData[]>(toasts)

  const subscribe = useCallback((listener: Listener) => {
    listeners = [...listeners, listener]
    return () => {
      listeners = listeners.filter((l) => l !== listener)
    }
  }, [])

  useState(() => {
    const unsubscribe = subscribe(setItems)
    return unsubscribe
  })

  const dismiss = useCallback((id: string) => {
    dispatch(toasts.filter((t) => t.id !== id))
  }, [])

  return { toasts: items, dismiss }
}
