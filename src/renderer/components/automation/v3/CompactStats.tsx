import React from 'react'
import { Users, Monitor, Workflow, CheckCircle } from 'lucide-react'

interface CompactStatsProps {
  totalLeads: number
  totalPlatforms: number
  totalFlows: number
  totalRuns: number
}

export default function CompactStats({
  totalLeads,
  totalPlatforms,
  totalFlows,
  totalRuns
}: CompactStatsProps) {
  const stats = [
    {
      icon: Users,
      value: totalLeads,
      label: 'Leads',
      color: 'text-blue-600 dark:text-blue-400'
    },
    {
      icon: Monitor,
      value: totalPlatforms,
      label: 'Platforms',
      color: 'text-emerald-600 dark:text-emerald-400'
    },
    {
      icon: Workflow,
      value: totalFlows,
      label: 'Flows',
      color: 'text-purple-600 dark:text-purple-400'
    },
    {
      icon: CheckCircle,
      value: totalRuns,
      label: 'Runs',
      color: 'text-amber-600 dark:text-amber-400'
    }
  ]

  return (
    <div className="flex items-center gap-4 text-sm">
      {stats.map((stat, index) => {
        const Icon = stat.icon
        return (
          <React.Fragment key={stat.label}>
            {index > 0 && (
              <span className="text-neutral-300 dark:text-neutral-700">|</span>
            )}
            <div className="flex items-center gap-2">
              <Icon size={16} className={stat.color} />
              <span className="font-semibold text-neutral-900 dark:text-neutral-100">
                {stat.value}
              </span>
              <span className="text-neutral-600 dark:text-neutral-400">
                {stat.label}
              </span>
            </div>
          </React.Fragment>
        )
      })}
    </div>
  )
}
