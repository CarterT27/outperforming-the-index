"use client"

import { useEffect, useRef } from "react"

interface DataPoint {
  date: Date
  price: number
}

interface ChartCanvasProps {
  data: DataPoint[]
  color: string
  progress: number
  width?: number
  height?: number
}

export function ChartCanvas({ data, color, progress, width = 800, height = 400 }: ChartCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Set canvas size
    canvas.width = width
    canvas.height = height

    const padding = 40

    // Clear canvas
    ctx.clearRect(0, 0, width, height)

    // Draw axes
    ctx.strokeStyle = "#e5e7eb"
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(padding, height - padding)
    ctx.lineTo(width - padding, height - padding)
    ctx.moveTo(padding, padding)
    ctx.lineTo(padding, height - padding)
    ctx.stroke()

    // Draw data line
    if (data.length === 0) return

    const maxPrice = Math.max(...data.map((d) => d.price))
    const minPrice = Math.min(...data.map((d) => d.price))
    const priceRange = maxPrice - minPrice

    const pointsToShow = Math.floor(data.length * progress)

    ctx.strokeStyle = color
    ctx.lineWidth = 3
    ctx.beginPath()

    for (let i = 0; i < pointsToShow; i++) {
      const x = padding + (i / (data.length - 1)) * (width - 2 * padding)
      const y = height - padding - ((data[i].price - minPrice) / priceRange) * (height - 2 * padding)

      if (i === 0) {
        ctx.moveTo(x, y)
      } else {
        ctx.lineTo(x, y)
      }
    }
    ctx.stroke()

    // Add glow effect
    ctx.shadowColor = color
    ctx.shadowBlur = 10
    ctx.stroke()
    ctx.shadowBlur = 0
  }, [data, color, progress, width, height])

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full border rounded-lg bg-white"
      style={{ maxWidth: width, maxHeight: height }}
    />
  )
}
