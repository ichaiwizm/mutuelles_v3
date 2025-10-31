import { registerRunner } from './queue'
import { getLeadById } from '../leads/repo'
import { mapSwisslifeSantePro } from '../../mappers/swisslife-sante-pro.mapper'
import * as sl from '../../adapters/swisslife.adapter'
import type { Task } from '../../shared/types/canonical'

registerRunner('swisslife:sante-pro', async (task: Task) => {
  const lead = getLeadById(task.leadId)
  if (!lead) throw new Error('Lead introuvable')
  const data = mapSwisslifeSantePro(lead)
  await sl.login()
  await sl.remplirDevisSantePro(data)
  const res = await sl.recupererResultat()
  return { ok: true, resultPath: res.pdfPath ?? undefined }
})

