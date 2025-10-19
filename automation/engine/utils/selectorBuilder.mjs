// Selector template builder utility
export function buildOptionSelectorFromTemplate(template, value) {
  const strValue = String(value)
  return template
    .replace(/\{\{value\}\}/g, strValue)
    .replace(/\{\{valueLower\}\}/g, strValue.toLowerCase())
    .replace(/\{\{valueUpper\}\}/g, strValue.toUpperCase())
}
