import { BaseCommand } from '../BaseCommand.mjs'
import { buildOptionSelectorFromTemplate } from '../../utils/selectorBuilder.mjs'

export class SelectFieldCommand extends BaseCommand {
  async execute(step) {
    const activeContext = this.getActiveContext()
    const fieldDef = this.resolveField(step)

    let value = this.resolveValueWithMappings(step, fieldDef)

    const validation = this.validateOptionalValue(step, value, 'selectField')
    if (validation.skip) return

    const open = fieldDef?.options?.open_selector || fieldDef.selector
    if (!open) throw new Error(`open_selector manquant pour ${this.getFieldName(step)}`)
    console.log('[hl] selectField %s -> %s', this.getFieldName(step), String(value))

    // Si aucune liste d'items n'est fournie, utiliser selectOption directement
    if (!fieldDef?.options?.items || fieldDef.options.items.length === 0) {
      const stringValue = String(value)
      if (fieldDef?.options?.option_selector_template) {
        try {
          await activeContext.selectOption(open, stringValue)
          await new Promise(r => setTimeout(r, step.postDelay_ms || 200))
          return
        } catch (err) {
          await activeContext.click(open).catch(()=>{})
          await new Promise(r => setTimeout(r, 150))
          const optionSelector = buildOptionSelectorFromTemplate(fieldDef.options.option_selector_template, stringValue)
          const optionHandle = await activeContext.waitForSelector(optionSelector, { state: 'attached', timeout: 5000 })
          await optionHandle.evaluate((opt) => {
            const select = opt.closest('select')
            if (!select) return
            for (const other of Array.from(select.options)) {
              other.selected = false
              other.removeAttribute('selected')
            }
            select.value = opt.value
            opt.selected = true
            opt.setAttribute('selected', 'selected')
            select.dispatchEvent(new Event('input', { bubbles: true }))
            select.dispatchEvent(new Event('change', { bubbles: true }))
          })
          await new Promise(r => setTimeout(r, step.postDelay_ms || 200))
          return
        }
      }
      await activeContext.selectOption(open, stringValue)
      await new Promise(r => setTimeout(r, step.postDelay_ms || 200))
      return
    }

    await activeContext.click(open)
    await new Promise(r => setTimeout(r, 300))
    let item = fieldDef.options.items.find((it)=>String(it.value)===String(value))
    if (!item) {
      item = fieldDef.options.items.find((it)=>String(it.label).toLowerCase()===String(value).toLowerCase())
    }
    if (!item?.option_selector) throw new Error(`option_selector manquant pour ${step.field}:${value}`)
    await activeContext.waitForSelector(item.option_selector, { state: 'visible', timeout: 5000 })
    await activeContext.click(item.option_selector)
  }

  describe(step) {
    return `Sélectionner ${step.domainField||step.field}`
  }
}
