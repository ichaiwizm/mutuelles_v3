// Template parsing resolver for {lead.xxx}, {credentials.xxx}, {env.XXX}
export class TemplateResolver {
  parseTemplates(value, ctx) {
    if (!value || typeof value !== 'string') return value

    let result = value

    // Replace {credentials.username}
    result = result.replace(/\{credentials\.username\}/g, ctx.username || '')
    // Replace {credentials.password}
    result = result.replace(/\{credentials\.password\}/g, ctx.password || '')

    // Replace {env.VAR}
    result = result.replace(/\{env\.([A-Za-z_][A-Za-z0-9_]*)\}/g, (match, varName) => {
      return process.env[varName] || ''
    })

    // Replace {lead.path.to.value}
    result = result.replace(/\{lead\.([^}]+)\}/g, (match, path) => {
      const val = this.getByPath(ctx.lead, path)
      return val !== undefined && val !== null ? String(val) : ''
    })

    return result
  }

  getByPath(obj, pth) {
    try {
      if (!pth || !obj) return undefined
      // Convert bracket notation to dot notation: children[0].birthDate → children.0.birthDate
      const normalizedPath = pth.replace(/\[(\w+)\]/g, '.$1')
      // Split and reduce
      return normalizedPath.split('.').reduce((acc, key) => {
        if (acc === null || acc === undefined) return undefined
        return acc[key]
      }, obj)
    } catch {
      return undefined
    }
  }
}
