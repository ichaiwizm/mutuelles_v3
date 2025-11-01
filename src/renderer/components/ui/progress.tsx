import * as React from 'react'
import { cn } from '../../lib/cn'

export function Progress(p: { value: number; className?: string }) {
  const v = Math.max(0, Math.min(100, p.value || 0))
  return (
    <div className={cn('h-2 w-full rounded bg-neutral-200 overflow-hidden', p.className)}>
      <div className="h-full bg-blue-600 transition-all" style={{ width: `${v}%` }} />
    </div>
  )
}

