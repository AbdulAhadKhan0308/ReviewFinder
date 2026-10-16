// Shown when a restaurant has no uploaded image.
export const defaultRestaurantImage = '/default-restaurant.svg'

// The server already rounds the average to 2 decimals; this only fixes how many digits are shown.
export function formatRating(averageRating: number | null, reviewCount: number) {
  if (averageRating === null) return 'No reviews'
  return `★ ${averageRating.toFixed(2)} · ${reviewCount} ${reviewCount === 1 ? 'review' : 'reviews'}`
}

export function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { dateStyle: 'medium' })
}
