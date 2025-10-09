import { useState, useEffect } from 'react'
import { FormSchema, generateFormSchema } from '@renderer/utils/formSchemaGenerator'

export function useFormSchema() {
  const [schema, setSchema] = useState<FormSchema | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadSchema() {
      try {
        setLoading(true)
        setError(null)
        const generatedSchema = await generateFormSchema()
        setSchema(generatedSchema)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load form schema')
      } finally {
        setLoading(false)
      }
    }

    loadSchema()
  }, [])

  return { schema, loading, error }
}
