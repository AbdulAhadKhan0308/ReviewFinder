import { ApiError } from '../api/client'

// These mirror the server's limits so most mistakes are caught before a request is sent.
export const limits = { email: 254, displayName: 50, passwordMin: 8, passwordMax: 128 }

// Same rule as the server: exactly one @, with something on both sides.
const emailPattern = /^[^\s@]+@[^\s@]+$/

export function validateEmail(value: string) {
  const email = value.trim()
  if (!email) return 'Enter your email address.'
  if (email.length > limits.email) return `Email must be ${limits.email} characters or fewer.`
  if (!emailPattern.test(email)) return 'Enter a valid email address.'
  return undefined
}

export function validateNewPassword(value: string) {
  if (!value) return 'Enter a password.'
  if (value.length < limits.passwordMin || value.length > limits.passwordMax) {
    return `Password must be ${limits.passwordMin} to ${limits.passwordMax} characters.`
  }
  return undefined
}

export function validateDisplayName(value: string) {
  const name = value.trim()
  if (!name) return 'Enter a display name.'
  if (name.length > limits.displayName) return `Display name must be ${limits.displayName} characters or fewer.`
  return undefined
}

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
