import { apiFetch } from './client'

export type Review = {
  id: string
  rating: number
  text: string | null
  authorDisplayName: string
  createdAt: string
  updatedAt: string
  // Only decides whether edit and delete are offered; the server checks authorship itself.
  isMine: boolean
}

export type ReviewInput = {
  rating: number
  // Left out for a review without text.
  text?: string
}

const restaurantReviewsPath = (restaurantId: string) => `/api/restaurants/${encodeURIComponent(restaurantId)}/reviews`
const reviewPath = (id: string) => `/api/reviews/${encodeURIComponent(id)}`

export const reviewsListPath = (restaurantId: string, query: URLSearchParams) =>
  `${restaurantReviewsPath(restaurantId)}?${query}`
export const reviewsBreakdownPath = (restaurantId: string) => `${restaurantReviewsPath(restaurantId)}/breakdown`

export const createReview = (restaurantId: string, input: ReviewInput) =>
  apiFetch<Review>(restaurantReviewsPath(restaurantId), { method: 'POST', body: input })

export const updateReview = (id: string, input: ReviewInput) =>
  apiFetch<Review>(reviewPath(id), { method: 'PUT', body: input })

export const deleteReview = (id: string) => apiFetch<void>(reviewPath(id), { method: 'DELETE' })
