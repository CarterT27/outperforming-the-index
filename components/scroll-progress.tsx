"use client"

import { useEffect, useState } from "react"

export function ScrollProgress() {
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const handleScroll = () => {
      const scrolled = window.scrollY
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight
      const progress = Math.min(scrolled / maxScroll, 1)
      setProgress(progress)
    }

    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  return (
    <div className="fixed top-0 left-0 w-full h-1 bg-gray-200 z-50">
      <div className="h-full bg-blue-600 transition-all duration-100" style={{ width: `${progress * 100}%` }} />
    </div>
  )
}
