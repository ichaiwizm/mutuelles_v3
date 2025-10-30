export function pickPlatformSlice(platformData: Record<string, any> | undefined, carrier: 'alptis' | 'swisslifeone') {
  const out: Record<string, any> = {}
  if (!platformData) return out
  const prefix = carrier + '.'
  for (const [k, v] of Object.entries(platformData)) {
    if (k.startsWith(prefix)) {
      out[k] = v
    }
  }
  // Include common keys that are not carrier-specific (best-effort heuristic)
  // Common keys are those not starting with a known carrier prefix
  const carriers = ['alptis.', 'swisslifeone.']
  for (const [k, v] of Object.entries(platformData)) {
    if (!carriers.some(p => k.startsWith(p))) {
      out[k] = v
    }
  }
  return out
}

