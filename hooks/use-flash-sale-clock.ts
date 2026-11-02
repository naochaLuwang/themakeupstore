'use client'
import { useEffect, useReducer } from 'react'
import type { FlashSaleRow } from '@/lib/flash-sale-helper'
// Re-render at sale boundaries; identical schedules share a stable effect dependency.
export function useFlashSaleClock(sales: Pick<FlashSaleRow, 'starts_at' | 'ends_at'>[]) {
  const [now, tick] = useReducer((_previous: number, next: number) => next, 0, Date.now)
  const boundaryKey = sales.flatMap(s => [s.starts_at, s.ends_at]).join('|')
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined
    const schedule = () => {
      clearTimeout(timer)
      const time = Date.now()
      const boundaries = boundaryKey.split('|').map(Date.parse).filter(t => t > time)
      timer = setTimeout(update, Math.max(1, Math.min(30_000, ...boundaries.map(t => t - time))))
    }
    const update = () => { tick(Date.now()); schedule() }
    timer = setTimeout(update, 0)
    window.addEventListener('focus', update)
    return () => { clearTimeout(timer); window.removeEventListener('focus', update) }
  }, [boundaryKey])
  return now
}
