import * as React from 'react'

export function Switch(p: { checked: boolean; onChange: (v: boolean)=>void; label?: string }) {
  return (
    <label className="inline-flex items-center gap-2 cursor-pointer select-none">
      <span className="relative inline-block w-10 h-6 bg-neutral-300 rounded-full">
        <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${p.checked?'translate-x-4':''}`} />
      </span>
      {p.label && <span className="text-sm opacity-80">{p.label}</span>}
      <input type="checkbox" checked={p.checked} onChange={(e)=> p.onChange(e.target.checked)} className="hidden" />
    </label>
  )
}

