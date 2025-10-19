// FillField command - fill field with value (supports jQuery datepicker)
import { BaseCommand } from '../BaseCommand.mjs'

export class FillFieldCommand extends BaseCommand {
  async execute(step) {
    const activeContext = this.getActiveContext()
    const fieldDef = this.resolveField(step)
    let value = this.resolveValue(step)

    // Parse templates in value if it's a string
    if (typeof value === 'string') {
      value = this.parseTemplates(value)
    }

    // Validate optional value
    const validation = this.validateOptionalValue(step, value, 'fillField')
    if (validation.skip) return

    if (!fieldDef.selector) throw new Error(`Selector manquant pour ${this.getFieldName(step)}`)

    const valueStr = String(value)
    const logName = this.getFieldName(step)
    const logValue = String(logName).toLowerCase().includes('password') ? '***' : valueStr
    console.log('[hl] fillField %s = %s', logName, logValue)

    // Vérifier si la méthode jQuery est demandée explicitement
    const useJQueryMethod = step.method === 'jquery'

    if (useJQueryMethod) {
      // Méthode jQuery: utiliser evaluate pour manipuler jQuery datepicker directement
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

          // Fermer le datepicker s'il est ouvert
          if ($elem.datepicker) {
            try {
              $elem.datepicker('hide')
            } catch (e) {}
          }

          // Définir la valeur de plusieurs façons pour garantir la persistance
          // 1. Définir l'attribut HTML value
          elem.value = value
          elem.setAttribute('value', value)

          // 2. Définir via jQuery
          $elem.val(value)

          // 3. Si datepicker existe, utiliser sa méthode setDate
          if ($elem.datepicker && typeof $elem.datepicker === 'function') {
            try {
              // Parser la date au format français DD/MM/YYYY
              const parts = value.split('/')
              if (parts.length === 3) {
                const day = parseInt(parts[0], 10)
                const month = parseInt(parts[1], 10) - 1 // mois est 0-indexed en JS
                const year = parseInt(parts[2], 10)
                const dateObj = new Date(year, month, day)
                $elem.datepicker('setDate', dateObj)
              }
            } catch (e) {}
          }

          // 4. Déclencher TOUS les événements pour garantir la détection
          $elem.trigger('input')
          $elem.trigger('change')
          $elem.trigger('keyup')
          $elem.trigger('blur')

          // Marquer le champ comme valide (retirer classe d'erreur si présente)
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
        // Fallback sur pressSequentially
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
      // Méthode standard: utiliser fill()
      await activeContext.fill(fieldDef.selector, valueStr)
    }
  }

  describe(step) {
    return `Remplir ${step.domainField||step.field}`
  }
}
