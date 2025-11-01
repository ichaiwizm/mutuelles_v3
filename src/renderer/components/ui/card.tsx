import * as React from 'react'
import { cn } from '../../lib/cn'

export function Card(p: { children: React.ReactNode; className?: string }) {
  return <div className={cn('rounded-md border bg-white', p.className)}>{p.children}</div>
}
export function CardHeader(p: { children: React.ReactNode; className?: string }) {
  return <div className={cn('px-3 py-2 border-b font-medium', p.className)}>{p.children}</div>
}
export function CardContent(p: { children: React.ReactNode; className?: string }) {
  return <div className={cn('p-3', p.className)}>{p.children}</div>
}

