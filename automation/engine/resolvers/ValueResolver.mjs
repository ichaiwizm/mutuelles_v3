import { TemplateResolver } from './TemplateResolver.mjs'

export class ValueResolver {
  constructor() {
    this.templateResolver = new TemplateResolver()
  }

  resolve(step, ctx) {
    if (step.value !== undefined) return step.value
    if (typeof step.leadKey === 'string') {
      return this.getByPath(ctx.lead, step.leadKey)
    }
    return undefined
  }

  resolveWithMappings(step, ctx, fieldDef) {
    let value = this.resolve(step, ctx)

    if (typeof value === 'string') {
      value = this.templateResolver.parseTemplates(value, ctx)
    }

    if (fieldDef?.valueMappings && ctx.platform) {
      const platformMappings = fieldDef.valueMappings[ctx.platform]
      if (platformMappings && platformMappings[String(value)] !== undefined) {
        const mappedValue = platformMappings[String(value)]
        console.log('[ValueResolver] Mapping applied: %s -> %s', value, mappedValue)
        return mappedValue
      }
    }

    return value
  }

  getByPath(obj, pth) {
    return this.templateResolver.getByPath(obj, pth)
  }
}