import { Db } from './dbPersistence'
import type { RunContext } from './types'
import { createLogger } from '../../logger'

const logger = createLogger('Finalizer')

export function makeFinalizer(runContext: RunContext, send: (e:any)=>void) {
  const { runId } = runContext

  const finalizeRun = (finalStatus: 'completed' | 'failed' | 'stopped') => {
    try {
      const completedAt = new Date().toISOString()
      const durationMs = runContext.startedAt ? Date.now() - runContext.startedAt.getTime() : null
      Db.updateRun(runId, { status: finalStatus, completed_at: completedAt, duration_ms: durationMs })
    } catch (err) {
      logger.error('[Runner] Failed to update run completion in DB:', err)
    }
    send({ type: 'run-done', runId, message: finalStatus === 'completed' ? 'Terminé' : `Terminé (${finalStatus})` })
  }

  const checkCompletion = () => {
    if (runContext.activeTasks === 0 && !runContext.queue.isRunning) {
      const db = Db.conn()
      const hasErrors = db.prepare('SELECT COUNT(*) as count FROM execution_items WHERE run_id = ? AND status = ?').get(runId, 'error') as { count: number }
      const finalStatus = hasErrors.count > 0 ? 'failed' : 'completed'
      finalizeRun(finalStatus)
      return
    }
    if (Db.checkDbCompletion(runId) && !runContext.queue.isRunning) {
      const db = Db.conn()
      const hasErrors = db.prepare('SELECT COUNT(*) as count FROM execution_items WHERE run_id = ? AND status = ?').get(runId, 'error') as { count: number }
      const finalStatus = hasErrors.count > 0 ? 'failed' : 'completed'
      finalizeRun(finalStatus)
    }
  }

  return { finalizeRun, checkCompletion }
}
