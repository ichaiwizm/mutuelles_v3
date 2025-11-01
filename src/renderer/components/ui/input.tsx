import * as React from 'react'
import { cn } from '../../lib/cn'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(({ className, ...props }, ref) => (
  <input ref={ref} className={cn('h-9 w-full rounded-md border px-3 text-sm focus-visible:outline-none', className)} {...props} />
))
Input.displayName = 'Input'

