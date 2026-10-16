import { ApiError } from './client'

export type FormErrors<F extends string> = Partial<Record<F, string>>

// Splits a failed request into messages for known fields and one message for the whole form.
export function toFormErrors<F extends string>(err: unknown, fields: readonly F[]) {
  if (!(err instanceof ApiError)) {
    return { fieldErrors: {} as FormErrors<F>, formError: 'Something went wrong. Please try again.' }
  }

  const fieldErrors: FormErrors<F> = {}
  const unmatched: string[] = []
  for (const [key, messages] of Object.entries(err.fieldErrors)) {
    const field = fields.find((f) => f.toLowerCase() === key.toLowerCase())
    if (field) fieldErrors[field] = messages.join(' ')
    else unmatched.push(...messages)
  }

  const formError = [err.formMessage, ...unmatched].filter(Boolean).join(' ') || null
  return { fieldErrors, formError }
}
