import * as React from 'react'
import { cn } from '../../lib/cn'

export interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {}

export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(({ className, ...props }, ref) => (
  <input ref={ref} type="checkbox" className={cn('h-4 w-4 rounded border', className)} {...props} />
))
Checkbox.displayName = 'Checkbox'

