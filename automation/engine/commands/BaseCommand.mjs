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

  // Debug helper to trace which browsing context is actually used by commands.
  // Does not change behavior; logs current getter context vs. stack top vs. main page.
  async debugActiveContext(commandName, step, selector) {
    try {
      const active = this.getActiveContext()
      const stack = Array.isArray(this.context.contextStack) ? this.context.contextStack : []
      const stackTop = stack.length > 0 ? stack[stack.length - 1] : null
      const main = this.getMainPage()

      const ctor = (obj) => {
        try { return obj?.constructor?.name || typeof obj } catch { return 'unknown' }
      }
      const urlSafe = (obj) => {
        try { return typeof obj?.url === 'function' ? obj.url() : '(no-url)' } catch { return '(url-error)' }
      }

      const fieldName = this.getFieldName(step)
      const sel = selector || step?.selector || ''
      // One single concise line to keep logs readable across many steps
      console.log('[hl][ctx] %s %s selector=%s stackDepth=%d active===stackTop=%s active===main=%s active=(%s %s) stackTop=(%s %s) main=(%s %s)'
        , commandName
        , fieldName
        , sel
        , stack.length
        , String(active === stackTop)
        , String(active === main)
        , ctor(active)
        , urlSafe(active)
        , ctor(stackTop)
        , urlSafe(stackTop)
        , ctor(main)
        , urlSafe(main)
      )
    } catch (e) {
      console.log('[hl][ctx] debugActiveContext error: %s', e?.message || String(e))
    }
  }
}
