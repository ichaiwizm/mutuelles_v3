import { useState, useEffect } from 'react'

/**
 * Hook to get the current timestamp, updating at a specified interval
 * Useful for displaying live durations without forcing component re-renders
 *
 * @param enabled - Whether the timer should be active
 * @param interval - Update interval in milliseconds (default: 1000ms)
 * @returns Current timestamp in milliseconds
 *
 * @example
 * ```tsx
 * const now = useNow(isRunning, 1000)
 * const duration = now - startTime
 * ```
 */
export function useNow(enabled: boolean, interval: number = 1000): number {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    if (!enabled) {
      return
    }

    // Update immediately on mount/enable
    setNow(Date.now())

    // Then update at regular intervals
    const id = setInterval(() => {
      setNow(Date.now())
    }, interval)

    return () => clearInterval(id)
  }, [enabled, interval])

  return now
}
