import * as React from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { cn } from '../../lib/cn'

export const Dialog = DialogPrimitive.Root
export const DialogTrigger = DialogPrimitive.Trigger

export function DialogContent(p: { children: React.ReactNode; className?: string }) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 bg-black/30" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <DialogPrimitive.Content className={cn('bg-white rounded-md border w-full max-w-lg', p.className)}>
          {p.children}
        </DialogPrimitive.Content>
      </div>
    </DialogPrimitive.Portal>
  )
}

export const DialogHeader = (p: { children: React.ReactNode }) => (
  <div className="px-3 py-2 border-b font-medium">{p.children}</div>
)
export const DialogBody = (p: { children: React.ReactNode }) => (
  <div className="p-3">{p.children}</div>
)
export const DialogClose = DialogPrimitive.Close

