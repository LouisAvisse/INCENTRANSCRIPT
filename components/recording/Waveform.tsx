'use client'

import { useEffect, useRef } from 'react'

interface WaveformProps {
  data: Uint8Array
  isActive: boolean
}

export function Waveform({ data, isActive }: WaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    const width = canvas.offsetWidth
    const height = canvas.offsetHeight

    canvas.width = width * dpr
    canvas.height = height * dpr
    ctx.scale(dpr, dpr)

    ctx.clearRect(0, 0, width, height)

    const barCount = data.length
    const barWidth = width / barCount
    const centerY = height / 2
    const maxBarHeight = height * 0.45

    for (let i = 0; i < barCount; i++) {
      const value = data[i] / 255
      const barHeight = isActive ? Math.max(2, value * maxBarHeight) : 2

      // Amber accent with opacity based on value
      const opacity = isActive ? 0.3 + value * 0.7 : 0.15
      ctx.fillStyle = `rgba(245, 158, 11, ${opacity})`

      const x = i * barWidth
      ctx.fillRect(x, centerY - barHeight, barWidth - 1, barHeight * 2)
    }
  }, [data, isActive])

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full"
      style={{ display: 'block' }}
    />
  )
}
