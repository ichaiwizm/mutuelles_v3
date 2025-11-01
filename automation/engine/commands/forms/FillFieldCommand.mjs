import { BaseCommand } from '../BaseCommand.mjs'

export class FillFieldCommand extends BaseCommand {
  async execute(step) {
    const fieldDef = this.resolveField(step)
    let value = this.resolveValue(step)

    if (typeof value === 'string') {
      value = this.parseTemplates(value)
    }

    const validation = this.validateOptionalValue(step, value, 'fillField')
    if (validation.skip) return

    if (!fieldDef.selector) throw new Error(`Selector manquant pour ${this.getFieldName(step)}`)

    const valueStr = String(value)
    const logName = this.getFieldName(step)
    const logValue = String(logName).toLowerCase().includes('password') ? '***' : valueStr
    console.log('[hl] fillField %s = %s', logName, logValue)

    await this.debugActiveContext('fillField', step, fieldDef.selector)
    const activeContext = this.getActiveContext()
    const useJQueryMethod = step.method === 'jquery'

    if (useJQueryMethod) {
      try {
        const result = await activeContext.evaluate(({selector, value}) => {
          const elem = document.querySelector(selector)
          if (!elem) return { success: false, error: 'Element not found' }

          // Vérifier si jQuery est disponible
          if (typeof jQuery === 'undefined' && typeof $ === 'undefined') {
            return { success: false, error: 'jQuery not available' }
          }

          const $ = jQuery || window.$
          const $elem = $(elem)

          if ($elem.datepicker) {
            try {
              $elem.datepicker('hide')
            } catch (e) {}
          }

          elem.value = value
          elem.setAttribute('value', value)

          $elem.val(value)

          if ($elem.datepicker && typeof $elem.datepicker === 'function') {
            try {
              const parts = value.split('/')
              if (parts.length === 3) {
                const day = parseInt(parts[0], 10)
                const month = parseInt(parts[1], 10) - 1
                const year = parseInt(parts[2], 10)
                const dateObj = new Date(year, month, day)
                $elem.datepicker('setDate', dateObj)
              }
            } catch (e) {}
          }

          $elem.trigger('input')
          $elem.trigger('change')
          $elem.trigger('keyup')
          $elem.trigger('blur')

          $elem.removeClass('error').addClass('valid')

          return { success: true, finalValue: elem.value, attrValue: elem.getAttribute('value') }
        }, { selector: fieldDef.selector, value: valueStr })

        if (result.success) {
          console.log('[hl] fillField %s - date remplie via jQuery (value=%s)', step.field, result.finalValue)
        } else {
          throw new Error(result.error || 'jQuery method failed')
        }
      } catch (err) {
        console.log('[hl] fillField %s - méthode jQuery échouée: %s, fallback sur pressSequentially', step.field, err.message)
        const locator = activeContext.locator(fieldDef.selector)
        await locator.click()
        await new Promise(r => setTimeout(r, 200))
        await locator.clear()
        await locator.pressSequentially(valueStr, { delay: 50 })
        await new Promise(r => setTimeout(r, 200))
        await locator.press('Escape')
        await locator.blur()
        await new Promise(r => setTimeout(r, 300))
        console.log('[hl] fillField %s - date remplie via pressSequentially (fallback)', step.field)
      }
    } else {
      await activeContext.fill(fieldDef.selector, valueStr)
    }
  }
}
