#!/usr/bin/env node
import { randomUUID } from 'node:crypto'
import { openDb } from './core/connection.mjs'

// Pools de données pour génération aléatoire
const FIRST_NAMES_MALE = ['Baptiste', 'Nicolas', 'Xavier', 'Thomas', 'Alexandre', 'Julien', 'Maxime', 'Lucas', 'Hugo', 'Louis', 'Antoine', 'Pierre', 'François', 'Jean', 'Michel', 'Philippe', 'Daniel', 'Olivier', 'Stéphane', 'David']
const FIRST_NAMES_FEMALE = ['Marie', 'Sophie', 'Julie', 'Emma', 'Clara', 'Léa', 'Chloé', 'Laura', 'Sarah', 'Camille', 'Amélie', 'Claire', 'Céline', 'Isabelle', 'Anne', 'Catherine', 'Nathalie', 'Sylvie', 'Patricia', 'Valérie']
const LAST_NAMES = ['Deschamps', 'Dupont', 'Martin', 'Bernard', 'Dubois', 'Thomas', 'Robert', 'Petit', 'Richard', 'Durand', 'Moreau', 'Simon', 'Laurent', 'Lefebvre', 'Garcia', 'Martinez', 'Bernard', 'Petit', 'Roux', 'Fournier']

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
  const randomNum = randomInt(1, 999)
  return `${cleanFirst}.${cleanLast}${randomNum}@${domain}`
}

function generateFirstOfNextMonth() {
  const date = new Date()
  date.setMonth(date.getMonth() + 1)
  date.setDate(1)
  return formatDateISO(date)
}

function parseArgs() {
  const args = process.argv.slice(2)
  const opts = {
    count: 10,
    help: false
  }

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    const next = () => args[++i]

    if (arg === '--count' || arg === '-n') {
      const val = next()
      if (val) {
        opts.count = parseInt(val, 10) || 10
      }
    } else if (arg === '--help' || arg === '-h') {
      opts.help = true
    } else if (!arg.startsWith('-') && !isNaN(parseInt(arg, 10))) {
      // Support direct number argument: npm run db:generate-leads 50
      opts.count = parseInt(arg, 10)
    }
  }

  return opts
}

function usage() {
  console.log(`
📝 Generate Random Leads

Usage:
  npm run db:generate-leads [options]

Options:
  --count, -n <number>  Number of leads to generate (default: 10)
  --help, -h            Show this help

Examples:
  npm run db:generate-leads              # Generate 10 leads
  npm run db:generate-leads --count 50   # Generate 50 leads
  npm run db:generate-leads -n 100       # Generate 100 leads
`)
}

async function main() {
  const options = parseArgs()

  if (options.help) {
    usage()
    return
  }

  console.log('=== Generate Random Leads ===')
  console.log(`Count: ${options.count}`)
  console.log()

  const db = openDb()

  const insertLead = db.prepare(`
    INSERT INTO clean_leads (id, data, metadata, created_at)
    VALUES (?, ?, ?, ?)
  `)

  let inserted = 0
  let errors = 0

  const transaction = db.transaction(() => {
    for (let i = 0; i < options.count; i++) {
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
          category
        }

        // Ajouter workFramework avec une probabilité de 20% (pour certains cas Alptis)
        if (randomBoolean(0.2)) {
          subscriber.workFramework = randomChoice(['SALARIE', 'INDEPENDANT'])
        }

        if (childrenCount > 0) {
          subscriber.childrenCount = childrenCount
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

          // Ajouter workFramework pour le conjoint avec une probabilité de 15%
          if (randomBoolean(0.15)) {
            spouse.workFramework = randomChoice(['SALARIE', 'INDEPENDANT'])
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
        
        if ((i + 1) % 10 === 0) {
          process.stdout.write(`\r   Progress: ${i + 1}/${options.count}`)
        }
      } catch (err) {
        errors++
        console.error(`\n   Error creating lead ${i + 1}:`, err.message)
      }
    }
  })

  transaction()

  console.log(`\n`)
  console.log('✓ Generation completed')
  console.log(`  Created: ${inserted} leads`)
  if (errors > 0) {
    console.log(`  Errors: ${errors}`)
  }

  db.close()
}

main().catch(err => {
  console.error('[ERROR] Generation failed:', err.message)
  if (err.stack) {
    console.error(err.stack)
  }
  process.exit(1)
})

