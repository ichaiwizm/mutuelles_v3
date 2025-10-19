// Condition evaluation for skipIf/skipIfNot logic
export class ConditionEvaluator {
  constructor(valueResolver) {
    this.valueResolver = valueResolver
  }

  evaluateSkipIfCondition(condition, ctx) {
    if (!condition || typeof condition !== 'object') return false

    // Handle logical operators: or / and
    if (condition.or && Array.isArray(condition.or)) {
      return condition.or.some(subCondition => this.evaluateSkipIfCondition(subCondition, ctx))
    }

    if (condition.and && Array.isArray(condition.and)) {
      return condition.and.every(subCondition => this.evaluateSkipIfCondition(subCondition, ctx))
    }

    // Handle field-based conditions
    if (condition.field) {
      const fieldValue = this.valueResolver.getByPath(ctx.lead, condition.field)

      // isEmpty check
      if ('isEmpty' in condition) {
        const isEmpty = fieldValue === undefined || fieldValue === null || fieldValue === '' ||
                       (Array.isArray(fieldValue) && fieldValue.length === 0)
        return condition.isEmpty === true ? isEmpty : !isEmpty
      }

      // oneOf check (value in array)
      if (condition.oneOf && Array.isArray(condition.oneOf)) {
        return condition.oneOf.includes(fieldValue)
      }

      // equals check
      if ('equals' in condition) {
        return fieldValue === condition.equals
      }

      // notEquals check
      if ('notEquals' in condition) {
        return fieldValue !== condition.notEquals
      }

      // greaterThan check
      if ('greaterThan' in condition) {
        return typeof fieldValue === 'number' && fieldValue > condition.greaterThan
      }

      // lessThan check
      if ('lessThan' in condition) {
        return typeof fieldValue === 'number' && fieldValue < condition.lessThan
      }
    }

    return false
  }
}
