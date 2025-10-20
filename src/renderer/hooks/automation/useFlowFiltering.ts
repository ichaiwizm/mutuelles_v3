import { useMemo } from 'react'
import type { Platform, Flow, AdvancedSettings } from '../useAutomation'

interface UseFlowFilteringParams {
  platforms: Platform[]
  flows: Flow[]
  searchQuery: string
  settings?: AdvancedSettings
}

interface UseFlowFilteringReturn {
  visiblePlatforms: Platform[]
  visibleFlows: Flow[]
  filteredFlows: Flow[]
  flowsByPlatform: Record<string, Flow[]>
  hiddenButSelectedFlows: Flow[]
  getDefaultFlow: (platformFlows: Flow[]) => Flow | undefined
}

export function useFlowFiltering(
  platforms: Platform[],
  flows: Flow[],
  searchQuery: string,
  settings?: AdvancedSettings,
  selectedFlowIds?: Set<string>
): UseFlowFilteringReturn {
  // Apply visibility filters to platforms
  const visiblePlatforms = useMemo(() => {
    if (!settings?.enableVisibilityFiltering) return platforms
    if (!settings?.hiddenPlatforms || settings.hiddenPlatforms.length === 0) return platforms
    return platforms.filter(p => !settings.hiddenPlatforms.includes(p.slug))
  }, [platforms, settings?.hiddenPlatforms, settings?.enableVisibilityFiltering])

  // Apply visibility filters to flows
  const visibleFlows = useMemo(() => {
    if (!settings?.enableVisibilityFiltering) return flows

    let filtered = flows

    // Filter by hidden platforms (hide flows belonging to hidden platforms)
    if (settings?.hiddenPlatforms && settings.hiddenPlatforms.length > 0) {
      filtered = filtered.filter(f => !settings.hiddenPlatforms.includes(f.platform))
    }

    // Filter by hidden flows
    if (settings?.hiddenFlows && settings.hiddenFlows.length > 0) {
      filtered = filtered.filter(f => !settings.hiddenFlows.includes(f.slug))
    }

    return filtered
  }, [flows, settings?.hiddenFlows, settings?.hiddenPlatforms, settings?.enableVisibilityFiltering])

  // Filter flows by search query
  const filteredFlows = useMemo(() => {
    if (!searchQuery.trim()) return visibleFlows

    const query = searchQuery.toLowerCase()
    return visibleFlows.filter(
      (flow) =>
        flow.name.toLowerCase().includes(query) || flow.slug.toLowerCase().includes(query)
    )
  }, [visibleFlows, searchQuery])

  // Group flows by platform
  const flowsByPlatform = useMemo(() => {
    const groups: Record<string, Flow[]> = {}
    filteredFlows.forEach((flow) => {
      if (!groups[flow.platform]) {
        groups[flow.platform] = []
      }
      groups[flow.platform].push(flow)
    })
    return groups
  }, [filteredFlows])

  // Detect hidden but selected flows (safety check)
  const hiddenButSelectedFlows = useMemo(() => {
    if (!settings?.enableVisibilityFiltering) return []
    if (!settings?.hiddenFlows || settings.hiddenFlows.length === 0) return []
    if (!selectedFlowIds) return []

    const hiddenSelected: Flow[] = []
    selectedFlowIds.forEach(slug => {
      if (settings.hiddenFlows.includes(slug)) {
        const flow = flows.find(f => f.slug === slug)
        if (flow) {
          hiddenSelected.push(flow)
        }
      }
    })

    return hiddenSelected
  }, [selectedFlowIds, settings?.hiddenFlows, settings?.enableVisibilityFiltering, flows])

  // Get default (best) flow for a platform using intelligent scoring
  const getDefaultFlow = (platformFlows: Flow[]): Flow | undefined => {
    if (platformFlows.length === 0) return undefined

    const scored = platformFlows.map((flow) => {
      const name = (flow.name + ' ' + flow.slug).toLowerCase()
      let score = 0

      // Avoid these types of flows
      if (name.includes('login') || name.includes('inspect')) score -= 10

      // Prefer these keywords
      if (name.includes('full')) score += 5
      if (name.includes('sante')) score += 5
      if (name.includes('select')) score += 3
      if (name.includes('pro')) score += 3
      if (name.includes('slsis')) score += 5

      return { flow, score }
    })

    scored.sort((a, b) => b.score - a.score)
    return scored[0]?.flow || platformFlows[0]
  }

  return {
    visiblePlatforms,
    visibleFlows,
    filteredFlows,
    flowsByPlatform,
    hiddenButSelectedFlows,
    getDefaultFlow
  }
}
