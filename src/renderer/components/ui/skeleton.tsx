import * as React from 'react'
import { cn } from '../../lib/cn'

export function Skeleton(p: { className?: string }) {
  return <div className={cn('animate-pulse rounded bg-neutral-200', p.className)} />
}

