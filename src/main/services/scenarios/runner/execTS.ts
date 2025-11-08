import path from 'node:path'
import fs from 'node:fs'
import { FlowRunner } from '../../../../core/engine'
import type { Flow } from '../../../../core/dsl'
import { createLogger as createRunLogger } from '../../../../core/log'
import { getTSFlow, getPlatformSelectorsTS } from '../ts_catalog'

export async function execTS(args: {
  itemId: string
  platform: string
  flowSlug: string
  leadData: any
  username: string
  password: string
  mode: 'headless' | 'dev' | 'dev_private'
  keepOpen?: boolean
  onProgress?: (progress: any) => void
  sessionRunId?: string
  onBrowserCreated?: (browser: any, context: any) => void
  pauseGate?: (where: 'begin' | 'before-step', stepIndex?: number) => Promise<void>
}): Promise<{ runDir: string }>{
  const runId = `${args.itemId}`
  const runDir = path.join(process.cwd(), 'runs', runId)
  fs.mkdirSync(runDir, { recursive: true })

  const logger = createRunLogger(runId, { outputPath: path.join(runDir, 'run.ndjson') })

  const flow: Flow | null = getTSFlow(args.platform, args.flowSlug)
  if (!flow) throw new Error(`Flow not found: ${args.platform}/${args.flowSlug}`)

  const runner = new FlowRunner(runId, logger as any)

  const manifest: any = {
    run: {
      id: runId,
      slug: flow.slug,
      platform: args.platform,
      startedAt: new Date().toISOString(),
      mode: args.mode,
    },
    steps: [] as any[],
    lead: {
      name: `${args.leadData?.subscriber?.firstName || ''} ${args.leadData?.subscriber?.lastName || ''}`.trim(),
      id: args.leadData?.id || ''
    }
  }

  const credentials = { username: args.username, password: args.password }

  try {
    const selectors = getPlatformSelectorsTS(args.platform) || ({} as any)
    const result = await runner.execute(flow, args.leadData, selectors, credentials, {
      headless: args.mode === 'headless',
      trace: 'retain-on-failure',
      screenshots: true,
      outputDir: runDir,
      onBrowserCreated: args.onBrowserCreated,
      pauseGate: args.pauseGate,
      onProgress: (p: any) => {
        // p has: stepIndex, totalSteps, step, ok, ms, screenshot
        if (args.onProgress) args.onProgress({ stepIndex: p.stepIndex, totalSteps: p.totalSteps, stepMessage: p.step?.label || p.step?.type })
        manifest.steps.push({
          index: p.stepIndex,
          type: p.step?.type,
          label: p.step?.label,
          ok: p.ok !== false,
          ms: p.ms,
          screenshot: p.screenshot ? path.basename(p.screenshot) : undefined,
        })
      },
    })

    manifest.run.finishedAt = new Date().toISOString()
    fs.writeFileSync(path.join(runDir, 'index.json'), JSON.stringify(manifest, null, 2))
    logger.close()
    return { runDir }
  } catch (err: any) {
    manifest.error = { message: err?.message || String(err) }
    manifest.run.finishedAt = new Date().toISOString()
    try { fs.writeFileSync(path.join(runDir, 'index.json'), JSON.stringify(manifest, null, 2)) } catch {}
    logger.close()
    const e: any = new Error(err?.message || String(err))
    e.runDir = runDir
    throw e
  }
}
