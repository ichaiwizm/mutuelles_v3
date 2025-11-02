import { CreateLeadData, SubscriberInfo, SpouseInfo, ChildInfo, ProjectInfo } from '@shared/types/leads'
import { transformToCleanLead as sharedTransformToCleanLead } from '@shared/utils/leadFormData'

interface FormData {
  [domainKey: string]: any
}

export function transformFromCleanLead(lead: any): Record<string, any> {
  if (lead.data?.platformData && Object.keys(lead.data.platformData).length > 0) {
    return { ...lead.data.platformData }
  }

  const formData: Record<string, any> = {}

  if (lead.data?.subscriber) {
    const subscriber = lead.data.subscriber

    if (subscriber.civility) formData['subscriber.civility'] = subscriber.civility
    if (subscriber.lastName) formData['subscriber.lastName'] = subscriber.lastName
    if (subscriber.firstName) formData['subscriber.firstName'] = subscriber.firstName
    if (subscriber.birthDate) formData['subscriber.birthDate'] = subscriber.birthDate

    if (subscriber.telephone) formData['subscriber.telephone'] = subscriber.telephone
    if (subscriber.email) formData['subscriber.email'] = subscriber.email
    if (subscriber.address) formData['subscriber.address'] = subscriber.address
    if (subscriber.postalCode) formData['subscriber.postalCode'] = subscriber.postalCode
    if (subscriber.city) formData['subscriber.city'] = subscriber.city
    if (subscriber.departmentCode) formData['subscriber.departmentCode'] = subscriber.departmentCode

    if (subscriber.regime) formData['subscriber.regime'] = subscriber.regime
    if (subscriber.category) formData['subscriber.category'] = subscriber.category
    if (subscriber.status) formData['subscriber.status'] = subscriber.status
    if (subscriber.profession) formData['subscriber.profession'] = subscriber.profession
    if (subscriber.workFramework) formData['subscriber.workFramework'] = subscriber.workFramework

    if (subscriber.childrenCount !== undefined) formData['children.count'] = subscriber.childrenCount
  }

  if (lead.data?.spouse) {
    formData['conjoint'] = true
    const spouse = lead.data.spouse

    if (spouse.civility) formData['spouse.civility'] = spouse.civility
    if (spouse.firstName) formData['spouse.firstName'] = spouse.firstName
    if (spouse.lastName) formData['spouse.lastName'] = spouse.lastName
    if (spouse.birthDate) formData['spouse.birthDate'] = spouse.birthDate
    if (spouse.regime) formData['spouse.regime'] = spouse.regime
    if (spouse.category) formData['spouse.category'] = spouse.category
    if (spouse.status) formData['spouse.status'] = spouse.status
    if (spouse.profession) formData['spouse.profession'] = spouse.profession
    if (spouse.workFramework) formData['spouse.workFramework'] = spouse.workFramework
  }

  if (lead.data?.children && lead.data.children.length > 0) {
    formData['enfants'] = true
    formData['children.count'] = lead.data.children.length

    lead.data.children.forEach((child: any, i: number) => {
      if (child.birthDate) formData[`children[${i}].birthDate`] = child.birthDate
      if (child.gender) formData[`children[${i}].gender`] = child.gender
      if (child.regime) formData[`children[${i}].regime`] = child.regime
      if (child.ayantDroit) formData[`children[${i}].ayantDroit`] = child.ayantDroit
    })
  }

  if (lead.data?.project) {
    const project = lead.data.project

    if (project.name) formData['project.name'] = project.name
    if (project.dateEffet) formData['project.dateEffet'] = project.dateEffet
    if (project.plan) formData['project.plan'] = project.plan
    if (project.couverture !== undefined) formData['project.couverture'] = project.couverture
    if (project.ij !== undefined) formData['project.ij'] = project.ij
    if (project.simulationType) formData['project.simulationType'] = project.simulationType
    if (project.madelin !== undefined) formData['project.madelin'] = project.madelin
    if (project.resiliation !== undefined) formData['project.resiliation'] = project.resiliation
    if (project.reprise !== undefined) formData['project.reprise'] = project.reprise
    if (project.currentlyInsured !== undefined) formData['project.currentlyInsured'] = project.currentlyInsured
    if (project.ranges) formData['project.ranges'] = project.ranges

    if (project.levels) {
      if (project.levels.medicalCare !== undefined) formData['project.medicalCareLevel'] = project.levels.medicalCare
      if (project.levels.hospitalization !== undefined) formData['project.hospitalizationLevel'] = project.levels.hospitalization
      if (project.levels.optics !== undefined) formData['project.opticsLevel'] = project.levels.optics
      if (project.levels.dental !== undefined) formData['project.dentalLevel'] = project.levels.dental
    }
  }

  return formData
}

export function transformToCleanLead(formData: FormData): CreateLeadData {
  // Wrapper unique pour éviter toute divergence avec la version utilisée côté main
  return sharedTransformToCleanLead(formData as any)
}
