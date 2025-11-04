import path from 'node:path'

export async function execHL(args: {
  flowFile: string
  fieldsFile: string
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
  const { pathToFileURL } = await import('node:url')
  // Import depuis le nouvel index du moteur
  const enginePath = path.join(process.cwd(), 'automation', 'engine', 'index.mjs')
  const mod = await import(pathToFileURL(enginePath).href)
  const fn = (mod.runHighLevelFlow || mod.default) as (p: any) => Promise<{ runDir: string }>
  return fn({
    fieldsFile: args.fieldsFile,
    flowFile: args.flowFile,
    leadData: args.leadData,
    username: args.username,
    password: args.password,
    mode: args.mode,
    keepOpen: args.keepOpen ?? (args.mode !== 'headless'),
    outRoot: path.join(process.cwd(), 'runs'),
    dom: 'steps',
    onProgress: args.onProgress,
    sessionRunId: args.sessionRunId,
    onBrowserCreated: args.onBrowserCreated,
    pauseGate: args.pauseGate
  })
}

