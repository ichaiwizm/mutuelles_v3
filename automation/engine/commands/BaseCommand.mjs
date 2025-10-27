export class BaseCommand {
  constructor(context) {
    this.context = context
    this.fieldResolver = context?.resolvers?.field
    this.valueResolver = context?.resolvers?.value
    this.templateResolver = context?.resolvers?.template
  }

  async execute(step) {
    throw new Error('execute() must be implemented by subclass')
  }

  validate(step) {
    return true
  }

  describe(step) {
    return step.type
  }

  getActiveContext() {
    return this.context.getCurrentContext()
  }

  getMainPage() {
    return this.context.contextStack?.[0] || this.context.page
  }

  resolveField(step) {
    return this.fieldResolver.resolve(step, this.context.ctx)
  }

  resolveValue(step) {
    return this.valueResolver.resolve(step, this.context.ctx)
  }

  resolveValueWithMappings(step, fieldDef) {
    return this.valueResolver.resolveWithMappings(step, this.context.ctx, fieldDef)
  }

  parseTemplates(value) {
    return this.templateResolver.parseTemplates(value, this.context.ctx)
  }

  getFieldName(step) {
    return step.domainField || step.field || 'unknown'
  }

  validateOptionalValue(step, value, commandName) {
    if (value === undefined || value === null || value === '') {
      if (step.optional === true) {
        console.log('[hl] %s %s = SKIPPED (optional, missing value)', commandName, this.getFieldName(step))
        return { skip: true }
      }
      throw new Error(`Missing value for ${this.getFieldName(step)} (leadKey=${step.leadKey || ''}, value=${step.value || ''})`)
    }
    return { skip: false }
  }
}
