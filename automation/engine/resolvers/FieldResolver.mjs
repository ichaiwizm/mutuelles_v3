// Field definition resolution with dynamic index support
export class FieldResolver {
  getFieldByKey(fields, key) {
    if (!fields?.fields) throw new Error('Missing fields.fields property')
    const f = fields.fields.find((x) => x.key === key)
    if (!f) throw new Error(`Field not found: ${key}`)
    return f
  }

  getFieldByDomain(fields, domainKey) {
    if (!fields?.fields) throw new Error('Missing fields.fields property')
    const f = fields.fields.find((x) => x.domainKey === domainKey)
    if (!f) throw new Error(`Domain field not found: ${domainKey}`)
    return f
  }

  resolveFieldDef(ctx, step) {
    const hasDomain = typeof step.domainField === 'string' && step.domainField.length > 0
    const hasKey = typeof step.field === 'string' && step.field.length > 0
    if (hasDomain) return this.getFieldByDomain(ctx.fields, step.domainField)
    if (hasKey) return this.getFieldByKey(ctx.fields, step.field)
    throw new Error('Incomplete step: missing both field and domainField')
  }

  extractDynamicIndex(step) {
    const lk = typeof step.leadKey === 'string' ? step.leadKey : ''

    // Match array bracket notation: collection[N]
    let m = lk.match(/\[(\d+)\]/)
    if (m) return Number(m[1])

    // Match dot notation: collection.N.xxx or collection.N at end
    m = lk.match(/\.(\d+)(?:\.|$)/)
    if (m) return Number(m[1])

    // Otherwise, attempt from a value template like {lead.collection[N].xxx}
    if (typeof step.value === 'string') {
      m = step.value.match(/\{\s*lead\.[^}]*\[(\d+)\]/)
      if (m) return Number(m[1])
    }

    return null
  }

  withDynamicIndex(fieldDef, i) {
    const clone = JSON.parse(JSON.stringify(fieldDef))

    // Generic templating system based on placeholder {i}
    const placeholder = clone?.metadata?.dynamicIndex?.placeholder || '{i}'
    const indexBase = clone?.metadata?.dynamicIndex?.indexBase ?? 0
    const actualIndex = i + indexBase

    const apply = (sel) => {
      if (!sel || typeof sel !== 'string') return sel
      // Escape placeholder for regex (handles {i}, {{i}}, etc.)
      const escapedPlaceholder = placeholder.replace(/[{}]/g, '\\$&')
      return sel.replace(new RegExp(escapedPlaceholder, 'g'), String(actualIndex))
    }

    if (clone.selector) clone.selector = apply(clone.selector)
    if (clone?.options?.open_selector) clone.options.open_selector = apply(clone.options.open_selector)
    // Apply to all items if they have selectors with placeholders
    if (clone?.options?.items) {
      for (const item of clone.options.items) {
        if (item.option_selector) item.option_selector = apply(item.option_selector)
      }
    }

    return clone
  }

  // Helper method combining resolve + dynamic index
  resolve(step, ctx) {
    let f = this.resolveFieldDef(ctx, step)
    const idx = this.extractDynamicIndex(step)
    if (idx != null && f?.metadata?.dynamicIndex) {
      f = this.withDynamicIndex(f, idx)
    }
    return f
  }
}
