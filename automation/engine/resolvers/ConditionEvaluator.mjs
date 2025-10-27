export class ConditionEvaluator {
  constructor(valueResolver) {
    this.valueResolver = valueResolver
  }

  evaluateSkipIfCondition(condition, ctx) {
    if (!condition || typeof condition !== 'object') return false

    if (condition.or && Array.isArray(condition.or)) {
      return condition.or.some(subCondition => this.evaluateSkipIfCondition(subCondition, ctx))
    }

    if (condition.and && Array.isArray(condition.and)) {
      return condition.and.every(subCondition => this.evaluateSkipIfCondition(subCondition, ctx))
    }

    if (condition.field) {
      const fieldValue = this.valueResolver.getByPath(ctx.lead, condition.field)

      if ('isEmpty' in condition) {
        const isEmpty = fieldValue === undefined || fieldValue === null || fieldValue === '' ||
                       (Array.isArray(fieldValue) && fieldValue.length === 0)
        return condition.isEmpty === true ? isEmpty : !isEmpty
      }

      if (condition.oneOf && Array.isArray(condition.oneOf)) {
        return condition.oneOf.includes(fieldValue)
      }

      if ('equals' in condition) {
        return fieldValue === condition.equals
      }

      if ('notEquals' in condition) {
        return fieldValue !== condition.notEquals
      }

      if ('greaterThan' in condition) {
        return typeof fieldValue === 'number' && fieldValue > condition.greaterThan
      }

      if ('lessThan' in condition) {
        return typeof fieldValue === 'number' && fieldValue < condition.lessThan
      }
    }

    return false
  }
}
