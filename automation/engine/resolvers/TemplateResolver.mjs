export class TemplateResolver {
  parseTemplates(value, ctx) {
    if (!value || typeof value !== 'string') return value

    let result = value

    result = result.replace(/\{credentials\.username\}/g, ctx.username || '')
    result = result.replace(/\{credentials\.password\}/g, ctx.password || '')

    result = result.replace(/\{env\.([A-Za-z_][A-Za-z0-9_]*)\}/g, (match, varName) => {
      return process.env[varName] || ''
    })

    result = result.replace(/\{lead\.([^}]+)\}/g, (match, path) => {
      const val = this.getByPath(ctx.lead, path)
      return val !== undefined && val !== null ? String(val) : ''
    })

    return result
  }

  getByPath(obj, pth) {
    try {
      if (!pth || !obj) return undefined
      const normalizedPath = pth.replace(/\[(\w+)\]/g, '.$1')
      return normalizedPath.split('.').reduce((acc, key) => {
        if (acc === null || acc === undefined) return undefined
        return acc[key]
      }, obj)
    } catch {
      return undefined
    }
  }
}
