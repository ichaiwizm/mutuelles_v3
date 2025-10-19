/**
 * Génère une description human-readable d'un step de flow
 * @param {object} step - Step object
 * @returns {string} Description en français
 */
export function describeHL(step) {
  const getFieldName = (s) => s.domainField || s.field

  switch (step.type) {
    case 'goto':
      return `Aller sur ${step.url}`
    case 'fillField':
      return `Remplir ${getFieldName(step)}`
    case 'typeField':
      return `Saisir ${getFieldName(step)}`
    case 'toggleField':
      return `Toggle ${getFieldName(step)} -> ${step.state}`
    case 'selectField':
      return `Sélectionner ${getFieldName(step)}`
    case 'waitForField':
      return `Attendre ${getFieldName(step)}`
    case 'waitForNetworkIdle':
      return 'Attendre network idle'
    case 'pressKey':
      return `Appuyer ${step.key || step.code || 'Escape'}${getFieldName(step) ? ` sur ${getFieldName(step)}` : ''}`
    case 'scrollIntoView':
      return `Scroller vers ${getFieldName(step)}`
    case 'clickField':
      return `Cliquer ${getFieldName(step)}`
    case 'acceptConsent':
      return 'Consentement'
    case 'sleep':
      return `Pause ${step.timeout_ms || 0}ms`
    case 'enterFrame':
      return `Entrer dans iframe ${step.selector || ('url~' + (step.urlContains || ''))}`
    case 'exitFrame':
      return `Sortir de l'iframe`
    default:
      return step.type
  }
}
