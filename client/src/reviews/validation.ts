import type { FormErrors } from '../api/formErrors'

// Mirrors the server's limit.
export const reviewTextMax = 2000

export const reviewFields = ['rating', 'text'] as const
export type ReviewField = (typeof reviewFields)[number]

export function validateReview(rating: number | null, text: string): FormErrors<ReviewField> {
  return {
    rating: rating === null ? 'Choose a rating.' : undefined,
    text: text.trim().length > reviewTextMax ? 'Review must be 2,000 characters or fewer.' : undefined,
  }
}
