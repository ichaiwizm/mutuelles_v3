import { listByLead, updateStatus, appendLog, updateResultPath } from '../tasks/repo'
import type { Task } from '../../shared/types/canonical'

type Runner = (task: Task) => Promise<{ ok: boolean; resultPath?: string }>

const runners: Record<string, Runner> = {}

export function registerRunner(key: string, fn: Runner) {
  runners[key] = fn
}

export async function runTask(task: Task) {
  updateStatus(task.id, 'running')
  appendLog(task.id, `[${new Date().toISOString()}] started`)
  const key = `${task.platform}:${task.product}`
  const runner = runners[key]
  try {
    const res = runner ? await runner(task) : await fakeRunner(task)
    updateStatus(task.id, res.ok ? 'success' : 'failed')
    if (typeof res.resultPath !== 'undefined') {
      updateResultPath(task.id, res.resultPath ?? null)
      if (res.resultPath) appendLog(task.id, `result: ${res.resultPath}`)
    }
  } catch (err: any) {
    appendLog(task.id, String(err?.message || err))
    updateStatus(task.id, 'failed')
  }
}

export async function runAllPendingForLead(leadId: string, fetch: (leadId: string) => Task[]) {
  const tasks = fetch(leadId).filter((t) => t.status === 'pending')
  for (const t of tasks) {
    // eslint-disable-next-line no-await-in-loop
    await runTask(t)
  }
}

async function fakeRunner(_task: Task): Promise<{ ok: boolean; resultPath?: string }> {
  await new Promise((r) => setTimeout(r, 300))
  return { ok: true, resultPath: undefined }
}
