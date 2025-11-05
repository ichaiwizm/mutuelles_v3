#!/usr/bin/env node
import { randomUUID } from 'node:crypto'
import { pathToFileURL } from 'node:url'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Pools de données pour génération aléatoire
const FIRST_NAMES_MALE = ['Baptiste', 'Nicolas', 'Xavier', 'Thomas', 'Alexandre', 'Julien', 'Maxime', 'Lucas', 'Hugo', 'Louis', 'Antoine', 'Pierre', 'François', 'Jean', 'Michel']
const FIRST_NAMES_FEMALE = ['Marie', 'Sophie', 'Julie', 'Emma', 'Clara', 'Léa', 'Chloé', 'Laura', 'Sarah', 'Camille', 'Amélie', 'Claire', 'Céline', 'Isabelle', 'Anne']
const LAST_NAMES = ['Deschamps', 'Dupont', 'Martin', 'Bernard', 'Dubois', 'Thomas', 'Robert', 'Petit', 'Richard', 'Durand', 'Moreau', 'Simon', 'Laurent', 'Lefebvre', 'Garcia']

const DEPARTMENTS = [
  { code: 75, postalCodes: [75001, 75008, 75015, 75016, 75020] },
  { code: 44, postalCodes: [44000, 44100, 44200, 44300] },
  { code: 69, postalCodes: [69001, 69003, 69006, 69009] },
  { code: 13, postalCodes: [13001, 13008, 13013, 13015] },
  { code: 33, postalCodes: [33000, 33100, 33200, 33300] },
  { code: 59, postalCodes: [59000, 59100, 59200, 59300] },
  { code: 31, postalCodes: [31000, 31100, 31200, 31300] },
  { code: 35, postalCodes: [35000, 35200, 35400, 35700] },
  { code: 67, postalCodes: [67000, 67100, 67200, 67300] },
  { code: 38, postalCodes: [38000, 38100, 38200, 38400] }
]

const REGIMES = ['SECURITE_SOCIALE', 'TNS', 'AMEXA', 'SECURITE_SOCIALE_ALSACE_MOSELLE', 'AUTRES_REGIME_SPECIAUX']
const STATUSES = ['SALARIE', 'TNS', 'EXPLOITANT_AGRICOLE', 'AUTRE']
const CATEGORIES = ['CADRES', 'NON_CADRES']
const PROFESSIONS = ['Ingénieur', 'Médecin', 'Profession libérale', 'Commerçant', 'Cadre', 'Employé', 'Ouvrier', 'Enseignant', 'Infirmier', 'Avocat']

// Fonctions utilitaires
function randomChoice(array) {
  return array[Math.floor(Math.random() * array.length)]
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function randomBoolean(trueProbability = 0.5) {
  return Math.random() < trueProbability
}

function formatDateISO(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function generateBirthDate(minAge, maxAge) {
  const age = randomInt(minAge, maxAge)
  const birthDate = new Date()
  birthDate.setFullYear(birthDate.getFullYear() - age)
  birthDate.setMonth(randomInt(0, 11))
  birthDate.setDate(randomInt(1, 28))
  return formatDateISO(birthDate)
}

function generatePhoneE164() {
  const prefix = '+33'
  const number = randomInt(100000000, 999999999)
  return `${prefix}${number}`
}

function generateEmail(firstName, lastName) {
  const domains = ['gmail.com', 'yahoo.fr', 'hotmail.fr', 'outlook.fr', 'free.fr']
  const cleanFirst = firstName.toLowerCase().replace(/[^a-z]/g, '')
  const cleanLast = lastName.toLowerCase().replace(/[^a-z]/g, '')
  const domain = randomChoice(domains)
  return `${cleanFirst}.${cleanLast}@${domain}`
}

function generateFirstOfNextMonth() {
  const date = new Date()
  date.setMonth(date.getMonth() + 1)
  date.setDate(1)
  return formatDateISO(date)
}

function convertDDMMYYYYToISO(dateStr) {
  if (!dateStr) return undefined
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr // Déjà en ISO
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) {
    const [day, month, year] = dateStr.split('/')
    return `${year}-${month}-${day}`
  }
  return dateStr
}

export default {
  name: 'leads',
  description: 'Seed random leads for testing',
  required: false,

  async run(db, options = {}) {
    const { count = 10, skipExisting = true } = options

    if (skipExisting) {
      const existingCount = db.prepare('SELECT COUNT(*) as c FROM clean_leads').get().c
      if (existingCount > 0) {
        console.log(`     Leads already exist (${existingCount}), skipping...`)
        return { count: existingCount, skipped: true }
      }
    }

    const insertLead = db.prepare(`
      INSERT INTO clean_leads (id, data, metadata, created_at)
      VALUES (?, ?, ?, ?)
    `)

    let inserted = 0

    const transaction = db.transaction(() => {
      for (let i = 0; i < count; i++) {
        try {
          // Générer données souscripteur
          const civility = randomChoice(['MONSIEUR', 'MADAME'])
          const firstName = civility === 'MONSIEUR'
            ? randomChoice(FIRST_NAMES_MALE)
            : randomChoice(FIRST_NAMES_FEMALE)
          const lastName = randomChoice(LAST_NAMES)
          const birthDate = generateBirthDate(25, 65)
          const phoneE164 = generatePhoneE164()
          const email = generateEmail(firstName, lastName)
          const dept = randomChoice(DEPARTMENTS)
          const postalCode = String(randomChoice(dept.postalCodes))
          const departmentCode = String(dept.code)
          const regime = randomChoice(REGIMES)
          const status = randomChoice(STATUSES)
          const category = randomChoice(CATEGORIES)
          const profession = randomChoice(PROFESSIONS)
          const childrenCount = randomBoolean(0.7) ? randomInt(0, 3) : 0

          const subscriber = {
            civility,
            lastName,
            firstName,
            birthDate,
            phoneE164,
            email,
            postalCode,
            departmentCode,
            regime,
            status,
            profession,
            category,
            childrenCount: childrenCount > 0 ? childrenCount : undefined
          }

          // Générer conjoint (60% de chance)
          let spouse = undefined
          if (randomBoolean(0.6)) {
            const spouseCivility = civility === 'MONSIEUR' ? 'MADAME' : 'MONSIEUR'
            const spouseFirstName = spouseCivility === 'MONSIEUR'
              ? randomChoice(FIRST_NAMES_MALE)
              : randomChoice(FIRST_NAMES_FEMALE)
            const spouseLastName = randomChoice(LAST_NAMES)
            const spouseBirthDate = generateBirthDate(25, 65)

            spouse = {
              civility: spouseCivility,
              firstName: spouseFirstName,
              lastName: spouseLastName,
              birthDate: spouseBirthDate,
              regime: randomChoice(REGIMES),
              status: randomChoice(STATUSES),
              category: randomChoice(CATEGORIES),
              profession: randomChoice(PROFESSIONS)
            }
          }

          // Générer enfants
          let children = undefined
          if (childrenCount > 0) {
            children = []
            for (let j = 0; j < childrenCount; j++) {
              children.push({
                birthDate: generateBirthDate(0, 25),
                regime: randomChoice(['SECURITE_SOCIALE', 'TNS']),
                ayantDroit: randomChoice(['CLIENT', 'CONJOINT'])
              })
            }
          }

          // Générer projet
          const projectName = `Simulation ${lastName} ${firstName}`
          const dateEffet = generateFirstOfNextMonth()

          const project = {
            name: projectName,
            dateEffet
          }

          // Construire le leadData
          const leadData = {
            subscriber,
            project
          }

          if (spouse) {
            leadData.spouse = spouse
          }

          if (children && children.length > 0) {
            leadData.children = children
          }

          // Créer le lead
          const id = randomUUID()
          const createdAt = new Date().toISOString()
          const metadata = {
            createdManually: false,
            seeded: true,
            seedBatch: new Date().toISOString()
          }

          insertLead.run(
            id,
            JSON.stringify(leadData),
            JSON.stringify(metadata),
            createdAt
          )

          inserted++
        } catch (err) {
          console.error(`     Error creating lead ${i + 1}:`, err.message)
        }
      }
    })

    transaction()

    return { count: inserted }
  }
}

