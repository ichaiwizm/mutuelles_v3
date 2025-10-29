import type { CreateLeadData, SubscriberInfo, SpouseInfo, ChildInfo, ProjectInfo } from '@shared/types/leads'

type FlatFormData = Record<string, any>

function parseDateToDDMMYYYY(value: any): string | undefined {
  if (!value) return undefined
  if (typeof value === 'string') {
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(value)) return value
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      const [y, m, d] = value.split('-')
      return `${d}/${m}/${y}`
    }
  }
  return value
}

function extractAll(formData: FlatFormData): Record<string, any> {
  const out: Record<string, any> = {}
  for (const k of Object.keys(formData)) {
    const v = formData[k]
    if (v !== undefined && v !== null) out[k] = v
  }
  return out
}

export function transformToCleanLead(formData: FlatFormData): CreateLeadData {
  const subscriber: SubscriberInfo = {}

  // Identity
  if (formData['subscriber.civility']) subscriber.civility = formData['subscriber.civility']
  if (formData['subscriber.lastName']) subscriber.lastName = formData['subscriber.lastName']
  if (formData['subscriber.firstName']) subscriber.firstName = formData['subscriber.firstName']
  if (formData['subscriber.birthDate']) subscriber.birthDate = parseDateToDDMMYYYY(formData['subscriber.birthDate'])

  // Contact
  if (formData['subscriber.telephone']) subscriber.telephone = formData['subscriber.telephone']
  if (formData['subscriber.email']) subscriber.email = formData['subscriber.email']
  if (formData['subscriber.address']) subscriber.address = formData['subscriber.address']
  if (formData['subscriber.postalCode']) subscriber.postalCode = String(formData['subscriber.postalCode'])
  if (formData['subscriber.city']) subscriber.city = formData['subscriber.city']
  if (formData['subscriber.departmentCode']) subscriber.departmentCode = formData['subscriber.departmentCode']

  // Professional
  if (formData['subscriber.regime']) subscriber.regime = formData['subscriber.regime']
  if (formData['subscriber.category']) subscriber.category = formData['subscriber.category']
  if (formData['subscriber.status']) subscriber.status = formData['subscriber.status']
  if (formData['subscriber.profession']) subscriber.profession = formData['subscriber.profession']
  if (formData['subscriber.workFramework']) subscriber.workFramework = formData['subscriber.workFramework']

  if (formData['children.count'] !== undefined) subscriber.childrenCount = formData['children.count']

  let spouse: SpouseInfo | undefined
  if (formData['conjoint']) {
    spouse = {}
    if (formData['spouse.civility']) spouse.civility = formData['spouse.civility']
    if (formData['spouse.firstName']) spouse.firstName = formData['spouse.firstName']
    if (formData['spouse.lastName']) spouse.lastName = formData['spouse.lastName']
    if (formData['spouse.birthDate']) spouse.birthDate = parseDateToDDMMYYYY(formData['spouse.birthDate'])
    if (formData['spouse.regime']) spouse.regime = formData['spouse.regime']
    if (formData['spouse.category']) spouse.category = formData['spouse.category']
    if (formData['spouse.status']) spouse.status = formData['spouse.status']
    if (formData['spouse.profession']) spouse.profession = formData['spouse.profession']
    if (formData['spouse.workFramework']) spouse.workFramework = formData['spouse.workFramework']
  }

  const children: ChildInfo[] = []
  const count = Number(formData['children.count'] || 0)
  for (let i = 0; i < count; i++) {
    const child: ChildInfo = {}
    const b = formData[`children[${i}].birthDate`]
    const g = formData[`children[${i}].gender`]
    const r = formData[`children[${i}].regime`]
    const a = formData[`children[${i}].ayantDroit`]
    if (b) child.birthDate = parseDateToDDMMYYYY(b)
    if (g) child.gender = g
    if (r) child.regime = r
    if (a) child.ayantDroit = a
    children.push(child)
  }

  const project: ProjectInfo = {}
  if (formData['project.name']) project.name = formData['project.name']
  if (formData['project.dateEffet']) project.dateEffet = parseDateToDDMMYYYY(formData['project.dateEffet'])
  if (formData['project.plan']) project.plan = formData['project.plan']
  if (formData['project.couverture'] !== undefined) project.couverture = formData['project.couverture']
  if (formData['project.ij'] !== undefined) project.ij = formData['project.ij']
  if (formData['project.simulationType']) project.simulationType = formData['project.simulationType']
  if (formData['project.madelin'] !== undefined) project.madelin = formData['project.madelin']
  if (formData['project.resiliation'] !== undefined) project.resiliation = formData['project.resiliation']
  if (formData['project.reprise'] !== undefined) project.reprise = formData['project.reprise']
  if (formData['project.currentlyInsured'] !== undefined) project.currentlyInsured = formData['project.currentlyInsured']
  if (formData['project.ranges']) project.ranges = formData['project.ranges']

  const levels: any = {}
  if (formData['project.medicalCareLevel'] !== undefined) levels.medicalCare = formData['project.medicalCareLevel']
  if (formData['project.hospitalizationLevel'] !== undefined) levels.hospitalization = formData['project.hospitalizationLevel']
  if (formData['project.opticsLevel'] !== undefined) levels.optics = formData['project.opticsLevel']
  if (formData['project.dentalLevel'] !== undefined) levels.dental = formData['project.dentalLevel']
  if (Object.keys(levels).length > 0) project.levels = levels

  const platformData = extractAll(formData)

  const out: CreateLeadData = { subscriber, project, platformData }
  if (spouse) out.spouse = spouse
  if (children.length > 0) out.children = children
  return out
}

