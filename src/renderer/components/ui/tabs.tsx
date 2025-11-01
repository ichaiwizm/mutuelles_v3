import * as React from 'react'
import * as TabsPrimitive from '@radix-ui/react-tabs'
import { cn } from '../../lib/cn'

export const Tabs = TabsPrimitive.Root
export const TabsList = (p: TabsPrimitive.TabsListProps) => (
  <TabsPrimitive.List {...p} className={cn('inline-flex gap-1 border-b', p.className)} />
)
export const TabsTrigger = (p: TabsPrimitive.TabsTriggerProps) => (
  <TabsPrimitive.Trigger {...p} className={cn('px-3 py-2 text-sm data-[state=active]:border-b-2 data-[state=active]:border-neutral-900', p.className)} />
)
export const TabsContent = TabsPrimitive.Content

