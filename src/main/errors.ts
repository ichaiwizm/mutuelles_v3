import { app, dialog } from 'electron'

export function installMainErrorHandlers() {
  const show = (title: string, err: unknown) => {
    const message = err instanceof Error ? err.stack || err.message : String(err)
    console.error(title, err)
    if (!app.isPackaged) {
      dialog.showErrorBox(title, message)
    }
  }

  process.on('uncaughtException', (err) => show('Exception non interceptée', err))
  process.on('unhandledRejection', (reason) => show('Rejet de promesse non géré', reason))
}
