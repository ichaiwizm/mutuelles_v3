import type { CreateLeadData, SubscriberInfo, SpouseInfo, ChildInfo, ProjectInfo } from '@shared/types/leads'

type FlatFormData = Record<string, any>

/**
 * Extract department code from French postal code
 * Rules:
 * - 01-95: Standard departments (first 2 digits)
 * - 20xxx: Corsica (2A or 2B based on sub-range)
 * - 971-976: DOM-TOM (first 3 digits)
 */
function extractDepartmentFromPostalCode(postalCode: string): string | undefined {
  if (!postalCode || typeof postalCode !== 'string') return undefined

  const cleaned = postalCode.trim()
  if (!/^\d{5}$/.test(cleaned)) return undefined

  // DOM-TOM (971-976)
  const first3 = cleaned.substring(0, 3)
  if (['971', '972', '973', '974', '975', '976'].includes(first3)) {
    return first3
  }

  // Corsica (20xxx)
  const first2 = cleaned.substring(0, 2)
  if (first2 === '20') {
    const subCode = parseInt(cleaned.substring(2, 3))
    // 20000-20199 → 2A, 20200+ → 2B
    return subCode < 2 ? '2A' : '2B'
  }

  // Standard departments (01-95)
  const deptNum = parseInt(first2)
  if (deptNum >= 1 && deptNum <= 95) {
    return first2
  }

  return undefined
}

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
  const subscriber: Partial<SubscriberInfo> = {}

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

  // Auto-extract department code from postal code if not explicitly provided
  if (formData['subscriber.departmentCode']) {
    subscriber.departmentCode = formData['subscriber.departmentCode']
  } else if (subscriber.postalCode) {
    const extracted = extractDepartmentFromPostalCode(subscriber.postalCode)
    if (extracted) subscriber.departmentCode = extracted
  }

  // Professional
  if (formData['subscriber.regime']) subscriber.regime = formData['subscriber.regime']
  if (formData['subscriber.category']) subscriber.category = formData['subscriber.category']
  if (formData['subscriber.status']) subscriber.status = formData['subscriber.status']
  if (formData['subscriber.profession']) subscriber.profession = formData['subscriber.profession']
  if (formData['subscriber.workFramework']) subscriber.workFramework = formData['subscriber.workFramework']

  if (formData['children.count'] !== undefined) subscriber.childrenCount = formData['children.count']

  let spouse: Partial<SpouseInfo> | undefined
  if (formData['conjoint']) {
    const s: Partial<SpouseInfo> = {}
    if (formData['spouse.civility']) s.civility = formData['spouse.civility']
    if (formData['spouse.firstName']) s.firstName = formData['spouse.firstName']
    if (formData['spouse.lastName']) s.lastName = formData['spouse.lastName']
    if (formData['spouse.birthDate']) s.birthDate = parseDateToDDMMYYYY(formData['spouse.birthDate'])
    if (formData['spouse.regime']) s.regime = formData['spouse.regime']
    if (formData['spouse.category']) s.category = formData['spouse.category']
    if (formData['spouse.status']) s.status = formData['spouse.status']
    if (formData['spouse.profession']) s.profession = formData['spouse.profession']
    if (formData['spouse.workFramework']) s.workFramework = formData['spouse.workFramework']
    if (Object.keys(s).length > 0) spouse = s
  }

  const children: Array<Partial<ChildInfo>> = []
  const count = Number(formData['children.count'] || 0)
  for (let i = 0; i < count; i++) {
    const child: Partial<ChildInfo> = {}
    const b = formData[`children[${i}].birthDate`]
    const g = formData[`children[${i}].gender`]
    const r = formData[`children[${i}].regime`]
    const a = formData[`children[${i}].ayantDroit`]
    if (b) child.birthDate = parseDateToDDMMYYYY(b)
    if (g) child.gender = g
    if (r) child.regime = r
    if (a) child.ayantDroit = a
    if (child.birthDate) children.push(child)
  }

  const project: Partial<ProjectInfo> = {}
  if (formData['project.name']) project.name = formData['project.name']
  if (formData['project.dateEffet']) project.dateEffet = parseDateToDDMMYYYY(formData['project.dateEffet'])

  const levels: any = {}
  if (formData['project.medicalCareLevel'] !== undefined) levels.medicalCare = formData['project.medicalCareLevel']
  if (formData['project.hospitalizationLevel'] !== undefined) levels.hospitalization = formData['project.hospitalizationLevel']
  if (formData['project.opticsLevel'] !== undefined) levels.optics = formData['project.opticsLevel']
  if (formData['project.dentalLevel'] !== undefined) levels.dental = formData['project.dentalLevel']
  if (Object.keys(levels).length > 0) {
    // Also copy flat fields for canonical schema
    if (levels.medicalCare !== undefined) (project as any).medicalCareLevel = levels.medicalCare
    if (levels.hospitalization !== undefined) (project as any).hospitalizationLevel = levels.hospitalization
    if (levels.optics !== undefined) (project as any).opticsLevel = levels.optics
    if (levels.dental !== undefined) (project as any).dentalLevel = levels.dental
    ;(project as any).levels = levels
  }

  const out: CreateLeadData = { subscriber, project }
  if (spouse) out.spouse = spouse
  if (children.length > 0) out.children = children
  return out
}

/**
 * Transform lead data back to flat form data
 * Inverse of transformToCleanLead
 */
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

