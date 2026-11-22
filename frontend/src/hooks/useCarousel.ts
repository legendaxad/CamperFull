import { useCallback, useEffect, useState } from 'react'

interface CarouselOptions {
  count: number
  autoplayMs?: number
}

/** Index management for the Figma carousels (arrows + dots, optional autoplay that pauses on hover). */
export function useCarousel({ count, autoplayMs }: CarouselOptions) {
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const safeCount = Math.max(1, count)

  const go = useCallback((next: number) => setIndex(((next % safeCount) + safeCount) % safeCount), [safeCount])
  const next = useCallback(() => setIndex((i) => (i + 1) % safeCount), [safeCount])
  const prev = useCallback(() => setIndex((i) => (i - 1 + safeCount) % safeCount), [safeCount])

  useEffect(() => {
    if (!autoplayMs || paused || safeCount < 2) return
    const timer = window.setInterval(next, autoplayMs)
    return () => window.clearInterval(timer)
  }, [autoplayMs, paused, safeCount, next])

  return {
    index: Math.min(index, safeCount - 1),
    go,
    next,
    prev,
    pauseHandlers: { onMouseEnter: () => setPaused(true), onMouseLeave: () => setPaused(false) },
  }
}
