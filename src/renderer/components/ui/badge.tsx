import * as React from 'react'
import { cn } from '../../lib/cn'

export function Badge(p: { children: React.ReactNode; variant?: 'default'|'success'|'warning'|'error'; className?: string }) {
  const base = 'inline-flex items-center rounded px-2 py-0.5 text-xs'
  const v = p.variant === 'success' ? 'bg-green-100 text-green-700' : p.variant === 'warning' ? 'bg-amber-100 text-amber-700' : p.variant === 'error' ? 'bg-rose-100 text-rose-700' : 'bg-neutral-100 text-neutral-700'
  return <span className={cn(base, v, p.className)}>{p.children}</span>
}

