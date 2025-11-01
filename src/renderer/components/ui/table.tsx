import * as React from 'react'
import { cn } from '../../lib/cn'

export function Table(p: { children: React.ReactNode; className?: string }) {
  return <table className={cn('w-full text-sm', p.className)}>{p.children}</table>
}
export function THead(p: { children: React.ReactNode }) { return <thead className="bg-neutral-50">{p.children}</thead> }
export function TBody(p: { children: React.ReactNode }) { return <tbody className="divide-y">{p.children}</tbody> }
export function TR(p: { children: React.ReactNode; className?: string; onClick?: ()=>void }) {
  return <tr onClick={p.onClick} className={cn('hover:bg-neutral-50 cursor-pointer', p.className)}>{p.children}</tr>
}
export function TH(p: { children: React.ReactNode; className?: string; onClick?: React.MouseEventHandler<HTMLTableCellElement> }) {
  return <th onClick={p.onClick} className={cn('text-left px-3 py-2 font-medium cursor-pointer select-none', p.className)}>{p.children}</th>
}
export function TD(p: { children: React.ReactNode; className?: string }) { return <td className={cn('px-3 py-2', p.className)}>{p.children}</td> }
