/**
 * IPC handlers for platform leads service
 * Exposes platform lead generation and assignment functionality to the renderer process
 */

import { ipcMain } from 'electron'
import { PlatformLeadsService } from '../services/platform_leads'
import type {
  GeneratePlatformLeadOptions,
  AutoAssignFlowsOptions
} from '../../shared/types/platform_leads'

let service: PlatformLeadsService

function getService(): PlatformLeadsService {
  if (!service) {
    service = new PlatformLeadsService()
  }
  return service
}

export function registerPlatformLeadsIpc() {
  /**
   * Generate platform-specific lead data
   */
  ipcMain.handle('platformLeads:generate', async (_e, options: GeneratePlatformLeadOptions) => {
    return getService().generatePlatformLead(options)
  })

  /**
   * Auto-assign flows for a lead
   */
  ipcMain.handle('platformLeads:autoAssign', async (_e, options: AutoAssignFlowsOptions) => {
    return getService().autoAssignFlows(options)
  })

  /**
   * Get assignments for a lead
   */
  ipcMain.handle('platformLeads:getAssignments', async (_e, cleanLeadId: string) => {
    return getService().getAssignmentsForLead(cleanLeadId)
  })

  /**
   * Update assignment status
   */
  ipcMain.handle('platformLeads:updateStatus', async (_e, params: {
    assignmentId: string
    status: 'running' | 'completed' | 'failed'
    errorMessage?: string
  }) => {
    return getService().updateAssignmentStatus(
      params.assignmentId,
      params.status,
      params.errorMessage
    )
  })
}
