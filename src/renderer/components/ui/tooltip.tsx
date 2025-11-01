import * as React from 'react'
import * as TooltipPrimitive from '@radix-ui/react-tooltip'

export const TooltipProvider = TooltipPrimitive.Provider
export const Tooltip = TooltipPrimitive.Root
export const TooltipTrigger = TooltipPrimitive.Trigger
export const TooltipContent = (p: { children: React.ReactNode }) => (
  <TooltipPrimitive.Portal>
    <TooltipPrimitive.Content sideOffset={4} className="rounded bg-black text-white text-xs px-2 py-1">
      {p.children}
    </TooltipPrimitive.Content>
  </TooltipPrimitive.Portal>
)

