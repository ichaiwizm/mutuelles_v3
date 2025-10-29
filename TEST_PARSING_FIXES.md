# Tests de Validation des Corrections de Parsing

## 🧪 Comment Tester

### Option 1: Interface UI (Recommandé)
1. Lancer l'application Electron
2. Aller dans l'onglet "Import Email"
3. Sélectionner les mêmes 22 emails qui avaient échoué
4. Cliquer sur "Parse Selected Emails"
5. Comparer les résultats:
   - **Avant:** 14 valides, 8 invalides (63.6%)
   - **Attendu après:** 18-20 valides, 2-4 invalides (80-90%)

### Option 2: Console Browser (Debug détaillé)
1. Ouvrir DevTools (F12) dans l'application Electron
2. Dans la console, tester manuellement:

```javascript
// Test 1: Décodage HTML entities
const { TextCleaner } = require('./services/emailParsing/TextCleaner')

const testHtml = "Nom&nbsp;:&nbsp;DUPONT&nbsp;&nbsp;Prénom&nbsp;:&nbsp;Jean"
const cleaned = TextCleaner.cleanEmailContent(testHtml, false)
console.log('Input:', testHtml)
console.log('Output:', cleaned)
// Attendu: "Nom : DUPONT Prénom : Jean"

// Test 2: Validation téléphone
const phone1 = "0612345678"
const phone2 = "061234567801234"  // Trop long
const phone3 = "0612 34 56 78"    // Avec espaces

console.log(TextCleaner.cleanPhone(phone1))  // Attendu: "0612345678"
console.log(TextCleaner.cleanPhone(phone2))  // Attendu: "" (vide car invalide)
console.log(TextCleaner.cleanPhone(phone3))  // Attendu: "0612345678"

// Test 3: Extraction avec nouveaux patterns
const { FieldExtractor } = require('./services/emailParsing/FieldExtractor')

const emailContent = "Nom : MARTIN Prénom : Sophie Email : sophie@test.fr"
const lastName = FieldExtractor.extractLastName(emailContent)
const firstName = FieldExtractor.extractFirstName(emailContent)

console.log('LastName:', lastName.value)    // Attendu: "MARTIN"
console.log('FirstName:', firstName.value)  // Attendu: "Sophie"
```

---

## ✅ Tests Unitaires Basiques

### Test 1: HTML Entity Decoding
```javascript
const { TextCleaner } = require('./services/emailParsing/TextCleaner')

// Test cases
const tests = [
  {
    input: "Jean&nbsp;Dupont",
    expected: "Jean Dupont",
    name: "Non-breaking space"
  },
  {
    input: "Société&amp;Compagnie",
    expected: "Société&Compagnie",
    name: "Ampersand"
  },
  {
    input: "Fran&ccedil;ois",
    expected: "François",
    name: "Cedilla"
  },
  {
    input: "&#233;cole",
    expected: "école",
    name: "Numeric entity"
  }
]

tests.forEach(test => {
  const result = TextCleaner.decodeHtmlEntities(test.input)
  const pass = result === test.expected
  console.log(`${pass ? '✅' : '❌'} ${test.name}:`, result, '(expected:', test.expected + ')')
})
```

### Test 2: Field Extraction Boundaries
```javascript
const { FieldExtractor } = require('./services/emailParsing/FieldExtractor')

const testCases = [
  {
    content: "Nom : DUPONT Prénom : Jean",
    field: 'lastName',
    expected: "DUPONT",
    name: "Simple adjacent fields"
  },
  {
    content: "Nom : MARTIN-LEBLANC Prénom : Marie",
    field: 'lastName',
    expected: "MARTIN-LEBLANC",
    name: "Hyphenated name"
  },
  {
    content: "Nom : DUPONT PRENOM : Jean Email : test@mail.com",
    field: 'lastName',
    expected: "DUPONT",
    name: "All caps labels"
  },
  {
    content: "Prénom : Sophie Nom : BERNARD",
    field: 'firstName',
    expected: "Sophie",
    name: "Reversed order"
  }
]

testCases.forEach(test => {
  let result
  if (test.field === 'lastName') {
    result = FieldExtractor.extractLastName(test.content)
  } else if (test.field === 'firstName') {
    result = FieldExtractor.extractFirstName(test.content)
  }

  const pass = result.value === test.expected
  console.log(`${pass ? '✅' : '❌'} ${test.name}:`, result.value, '(expected:', test.expected + ')')
})
```

### Test 3: Phone Number Validation
```javascript
const { FieldExtractor } = require('./services/emailParsing/FieldExtractor')

const phoneTests = [
  {
    content: "Tel: 0612345678",
    expected: "0612345678",
    name: "Simple format"
  },
  {
    content: "Tel: 06 12 34 56 78",
    expected: "0612345678",
    name: "Spaced format"
  },
  {
    content: "Tel: 06.12.34.56.78",
    expected: "0612345678",
    name: "Dotted format"
  },
  {
    content: "Tel: 06-12-34-56-78",
    expected: "0612345678",
    name: "Dashed format"
  },
  {
    content: "Tel: 0612345678 Mobile: 0698765432",
    expected: "0612345678",
    name: "Multiple phones - should get first only"
  },
  {
    content: "0612345678",
    expected: "0612345678",
    name: "No label"
  }
]

phoneTests.forEach(test => {
  const result = FieldExtractor.extractPhone(test.content)
  const pass = result.value === test.expected
  console.log(`${pass ? '✅' : '❌'} ${test.name}:`, result.value, '(expected:', test.expected + ')')
})
```

### Test 4: Over-Extraction Prevention
```javascript
const { FieldExtractor } = require('./services/emailParsing/FieldExtractor')

// Test que les patterns NE CAPTURENT PAS trop
const badExtractions = [
  {
    content: "Nombre d'enfants : 2",
    field: 'lastName',
    shouldNotContain: "NOMBRE",
    name: "Should not extract 'Nombre d'enfants' as lastName"
  },
  {
    content: "Nom : DUPONT Prénom : Jean Téléphone : 0612345678 Email : test@mail.com",
    field: 'lastName',
    maxLength: 30,
    name: "Should not extract entire line as lastName"
  }
]

badExtractions.forEach(test => {
  let result
  if (test.field === 'lastName') {
    result = FieldExtractor.extractLastName(test.content)
  }

  let pass = true
  let reason = ''

  if (test.shouldNotContain && result.value) {
    pass = !result.value.includes(test.shouldNotContain)
    reason = pass ? 'OK' : `Contains forbidden text: ${test.shouldNotContain}`
  }

  if (test.maxLength && result.value) {
    pass = result.value.length <= test.maxLength
    reason = pass ? 'OK' : `Too long: ${result.value.length} chars (max ${test.maxLength})`
  }

  console.log(`${pass ? '✅' : '❌'} ${test.name}:`, reason, '- Value:', result.value)
})
```

---

## 📊 Vérification Visuelle

### Dans l'UI après import:

**Vérifier ces champs spécifiques dans les leads précédemment invalides:**

#### Lead 1 (19a249b95e476d02):
- ✅ `lastName` devrait être présent (pas null)
- ✅ `firstName` devrait être présent (pas null)
- ✅ Pas de `&nbsp;` nulle part

#### Lead 2 (19a249b84b6518ff):
- ✅ `lastName` ≠ "BRE D'ENFANTS"
- ✅ `firstName` devrait être présent
- ✅ `telephone` = 10 digits exactement

#### Lead 8 (198a8a64e240ce23):
- ✅ `lastName` < 30 caractères
- ✅ `firstName` < 30 caractères
- ✅ `telephone` = 10 digits (pas 40+)
- ✅ `email` format valide (pas de paragraphe)
- ✅ `postalCode` = 5 digits exactement

#### Lead 9 (198a8a5ab3ba6b2d):
- Mêmes vérifications que Lead 8

#### Lead 10 (198a8a53d53808f6):
- Mêmes vérifications que Lead 8

---

## 🐛 Si des Tests Échouent

### Problème: HTML entities toujours présents

**Solution:**
1. Vérifier que l'import est correct dans `email.ts`:
```typescript
const { TextCleaner } = require('./emailParsing/TextCleaner')
```

2. Redémarrer l'application Electron (pour recharger les modules)

3. Vérifier dans la console s'il y a des erreurs TypeScript

---

### Problème: Champs toujours trop longs

**Solution:**
1. Vérifier que `FieldExtractor.ts` utilise bien les nouveaux patterns avec `{1,25}?`

2. Vérifier que la validation dans `extractField()` est bien active:
```typescript
const validated = TextCleaner.validateField(rawValue, 100)
if (!validated) continue
```

3. Check dans la console:
```javascript
const { TextCleaner } = require('./services/emailParsing/TextCleaner')
const longText = "A".repeat(150)
console.log(TextCleaner.validateField(longText, 100))  // Devrait retourner ""
```

---

### Problème: Téléphones toujours concaténés

**Solution:**
1. Vérifier que le pattern phone utilise `(?=\D|$)` lookahead

2. Tester manuellement:
```javascript
const { FieldExtractor } = require('./services/emailParsing/FieldExtractor')
const content = "Tel: 0612345678 Mobile: 0698765432"
const result = FieldExtractor.extractPhone(content)
console.log(result.value)  // Devrait être "0612345678"
console.log(result.value.length)  // Devrait être 10
```

---

### Problème: Compilation TypeScript échoue

**Solution:**
1. Vérifier les imports dans tous les fichiers modifiés

2. Rebuild le projet:
```bash
npm run build
# ou
electron-vite build
```

3. Si erreur persiste, vérifier que `TextCleaner.ts` est bien dans le bon dossier:
```
src/main/services/emailParsing/TextCleaner.ts
```

---

## 📈 Métriques de Succès

### Avant corrections:
- Valid: 14/22 (63.6%)
- Invalid: 8/22 (36.4%)
- Champs avec `&nbsp;`: ~80% des leads
- Téléphones invalides: 6/22 (27%)
- Noms manquants: 8/22 (36%)

### Objectifs après corrections:
- Valid: 18-20/22 (80-90%) ✅
- Invalid: 2-4/22 (10-20%)
- Champs avec `&nbsp;`: 0% ✅
- Téléphones invalides: 0-2/22 (<10%) ✅
- Noms manquants: 0-2/22 (<10%) ✅

---

## 🎯 Checklist de Validation

- [ ] Application compile sans erreurs TypeScript
- [ ] Tous les imports sont corrects
- [ ] `TextCleaner.decodeHtmlEntities()` fonctionne
- [ ] `FieldExtractor.prepareContent()` nettoie le texte
- [ ] Patterns lastName/firstName s'arrêtent aux frontières
- [ ] Pattern phone ne concatène pas
- [ ] Validation rejette les valeurs trop longues
- [ ] Test avec 1-2 emails fonctionnels
- [ ] Test avec les 22 emails problématiques
- [ ] Taux de validation > 80%
- [ ] Aucun champ avec HTML entities
- [ ] Tous les téléphones = 10 digits

---

**Dernière mise à jour:** 2025-10-27
**Testeur:** _____________________
**Résultat:** ⬜ PASS  ⬜ FAIL  ⬜ PARTIEL
