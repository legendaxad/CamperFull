import { useEffect, useRef, useState, useSyncExternalStore } from 'react'

/** Delays a fast-changing value (search inputs) so each keystroke doesn't trigger a request. */
export function useDebouncedValue<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delay)
    return () => window.clearTimeout(timer)
  }, [value, delay])
  return debounced
}

export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const media = window.matchMedia(query)
      media.addEventListener('change', onChange)
      return () => media.removeEventListener('change', onChange)
    },
    () => window.matchMedia(query).matches,
    () => false,
  )
}

export function usePrefersReducedMotion(): boolean {
  return useMediaQuery('(prefers-reduced-motion: reduce)')
}

export function useDocumentTitle(title: string): void {
  useEffect(() => {
    document.title = title ? `${title} · FullCamper Admin` : 'FullCamper Admin'
  }, [title])
}

/**
 * Animates a number from its previous value to `target` (KPI count-up).
 * Returns the target immediately when reduced motion is requested.
 */
export function useCountUp(target: number, duration = 900): number {
  const reduced = usePrefersReducedMotion()
  const [value, setValue] = useState(reduced ? target : 0)
  const fromRef = useRef(0)

  useEffect(() => {
    if (reduced) {
      fromRef.current = target
      return
    }
    const from = fromRef.current
    const start = performance.now()
    let frame = 0
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / duration)
      const eased = 1 - Math.pow(1 - progress, 3)
      const current = from + (target - from) * eased
      setValue(current)
      if (progress < 1) frame = requestAnimationFrame(tick)
      else fromRef.current = target
    }
    frame = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(frame)
      fromRef.current = target
    }
  }, [target, duration, reduced])

  return reduced ? target : value
}

/** Closes popovers on outside click / Escape. */
export function useDismiss(open: boolean, onClose: () => void, refs: React.RefObject<HTMLElement | null>[]): void {
  const closeRef = useRef(onClose)
  useEffect(() => {
    closeRef.current = onClose
  })
  useEffect(() => {
    if (!open) return
    const onPointer = (event: PointerEvent) => {
      if (refs.some((ref) => ref.current?.contains(event.target as Node))) return
      closeRef.current()
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeRef.current()
    }
    document.addEventListener('pointerdown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
    // refs are stable objects
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])
}
