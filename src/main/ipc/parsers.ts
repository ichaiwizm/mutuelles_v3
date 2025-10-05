import { ipcMain } from 'electron'
import { ParserOrchestrator } from '../services/parsers/ParserOrchestrator'

export function registerParsersIPC() {
  // Parser du texte de lead
  ipcMain.handle('parsers:parse', async (_, content: string) => {
    try {
      if (!content || typeof content !== 'string') {
        throw new Error('Contenu invalide')
      }

      const result = ParserOrchestrator.parseContent(content)

      return { success: result.success, data: result }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erreur inconnue'
      return { success: false, error: message }
    }
  })

  // Identifier le provider seulement
  ipcMain.handle('parsers:identify', async (_, content: string) => {
    try {
      if (!content || typeof content !== 'string') {
        throw new Error('Contenu invalide')
      }

      const provider = ParserOrchestrator.identifyProvider(content)

      return { success: true, data: { provider } }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erreur inconnue'
      return { success: false, error: message }
    }
  })
}
