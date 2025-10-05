import React from 'react'
import { Sparkles, FileEdit } from 'lucide-react'

interface ModeSelectorProps {
  mode: 'intelligent' | 'manual'
  onModeChange: (mode: 'intelligent' | 'manual') => void
}

export default function ModeSelector({ mode, onModeChange }: ModeSelectorProps) {
  return (
    <div className="flex border-b border-neutral-200 dark:border-neutral-800">
      <button
        onClick={() => onModeChange('intelligent')}
        className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 border-b-2 font-medium text-sm transition-colors ${
          mode === 'intelligent'
            ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20'
            : 'border-transparent text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'
        }`}
      >
        <Sparkles size={18} />
        Intelligent
      </button>
      <button
        onClick={() => onModeChange('manual')}
        className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 border-b-2 font-medium text-sm transition-colors ${
          mode === 'manual'
            ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20'
            : 'border-transparent text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'
        }`}
      >
        <FileEdit size={18} />
        Manuel
      </button>
    </div>
  )
}
