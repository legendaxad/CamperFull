import { useEffect } from 'react'
import type { FieldValues, Path, UseFormSetError } from 'react-hook-form'
import type { ApiErrorDetail } from '@/types/api'

/**
 * Maps backend validation errors (`errors: [{ field: "body.email", message }]`) onto
 * React Hook Form fields so they appear next to the matching input.
 */
export function applyServerFieldErrors<T extends FieldValues>(
  errors: ApiErrorDetail[],
  fields: readonly Path<T>[],
  setError: UseFormSetError<T>,
): boolean {
  let applied = false
  for (const detail of errors) {
    const segments = detail.field?.split('.') ?? []
    const target = fields.find((field) => segments.join('.').endsWith(field))
    if (target) {
      setError(target, { type: 'server', message: detail.message })
      applied = true
    }
  }
  return applied
}

export function useServerFieldErrors<T extends FieldValues>(
  errors: ApiErrorDetail[],
  fields: readonly Path<T>[],
  setError: UseFormSetError<T>,
): void {
  useEffect(() => {
    if (errors.length) applyServerFieldErrors(errors, fields, setError)
  }, [errors, fields, setError])
}
