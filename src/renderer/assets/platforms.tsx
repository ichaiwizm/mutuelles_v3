import React from 'react'

export function PlatformIcon(p: { name: string; size?: number; className?: string }) {
  const s = p.size ?? 14
  const k = p.name.toLowerCase()
  if (k.includes('swiss')) return <SwissLife size={s} className={p.className} />
  if (k.includes('alptis')) return <Alptis size={s} className={p.className} />
  if (k.includes('malakoff')) return <Malakoff size={s} className={p.className} />
  if (k.includes('april')) return <April size={s} className={p.className} />
  if (k.includes('axa')) return <AXA size={s} className={p.className} />
  return <Default size={s} className={p.className} />
}

function SvgBase(p: { children: React.ReactNode; className?: string; size: number; viewBox?: string }) {
  return (
    <svg width={p.size} height={p.size} viewBox={p.viewBox || '0 0 24 24'} fill="none" className={p.className} xmlns="http://www.w3.org/2000/svg">
      {p.children}
    </svg>
  )
}

function SwissLife({ size, className }: any) {
  return (
    <SvgBase size={size} className={className}>
      <path d="M4 14c6-2 10-6 16-8-4 4-8 8-12 12" stroke="#D10A2A" strokeWidth="2" strokeLinecap="round"/>
    </SvgBase>
  )
}
function Alptis({ size, className }: any) {
  return (
    <SvgBase size={size} className={className}>
      <circle cx="12" cy="12" r="9" stroke="#0F766E" strokeWidth="2"/>
      <circle cx="12" cy="12" r="5" fill="#0F766E"/>
    </SvgBase>
  )
}
function Malakoff({ size, className }: any) {
  return (
    <SvgBase size={size} className={className}>
      <rect x="4" y="4" width="16" height="16" rx="4" stroke="#F59E0B" strokeWidth="2"/>
      <path d="M8 16l8-8" stroke="#F59E0B" strokeWidth="2"/>
    </SvgBase>
  )
}
function April({ size, className }: any) {
  return (
    <SvgBase size={size} className={className}>
      <path d="M4 16c2-6 6-10 12-12-2 6-6 10-12 12z" fill="#10B981"/>
    </SvgBase>
  )
}
function AXA({ size, className }: any) {
  return (
    <SvgBase size={size} className={className}>
      <rect x="3" y="3" width="18" height="18" rx="2" fill="#1D4ED8"/>
      <path d="M6 16l12-8" stroke="#FEE2E2" strokeWidth="2"/>
    </SvgBase>
  )
}
function Default({ size, className }: any) {
  return (
    <SvgBase size={size} className={className}>
      <circle cx="12" cy="12" r="8" stroke="#64748B" strokeWidth="2"/>
    </SvgBase>
  )
}

