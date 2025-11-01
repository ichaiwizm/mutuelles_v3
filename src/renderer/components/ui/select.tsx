import * as React from 'react'
import { cn } from '../../lib/cn'

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(({ className, children, ...props }, ref) => (
  <select ref={ref} className={cn('h-9 rounded-md border px-2 text-sm bg-white', className)} {...props}>
    {children}
  </select>
))
Select.displayName = 'Select'

