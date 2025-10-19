// EnterFrame command - enter iframe/frame context
import { BaseCommand } from '../BaseCommand.mjs'

export class EnterFrameCommand extends BaseCommand {
  async execute(step) {
    const mainPage = this.getMainPage()
    const { contextStack } = this.context
    let frame = null

    if (step.selector) {
      await mainPage.waitForSelector(step.selector, { timeout: step.timeout_ms || 15000 })
      const frameHandle = await mainPage.$(step.selector)
      if (!frameHandle) throw new Error(`Iframe introuvable: ${step.selector}`)
      frame = await frameHandle.contentFrame()
    } else if (step.urlContains) {
      const deadline = Date.now() + (step.timeout_ms || 15000)
      while (Date.now() < deadline) {
        const frames = mainPage.frames()
        frame = frames.find(fr => (fr.url() || '').includes(step.urlContains)) || null
        if (frame) break
        await new Promise(r => setTimeout(r, 200))
      }
      if (!frame) throw new Error(`Aucun frame avec url contenant "${step.urlContains}"`)
    } else {
      throw new Error('enterFrame requiert soit selector soit urlContains')
    }

    if (!frame) throw new Error('Impossible d\'accéder au contenu du frame')
    contextStack.push(frame)
    console.log('[hl] enterFrame %s - contexte empilé (profondeur: %d)', step.selector || `url~${step.urlContains}`, contextStack.length)
  }

  describe(step) {
    return `Entrer dans iframe ${step.selector||('url~'+(step.urlContains||''))}`
  }
}
