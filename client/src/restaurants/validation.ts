import type { FormErrors } from '../api/formErrors'
import type { RestaurantInput } from '../api/restaurants'

// These mirror the server's limits so most mistakes are caught before a request is sent.
export const restaurantLimits = { title: 100, location: 200, description: 2000, minCuisines: 1, maxCuisines: 3 }

export const restaurantFields = ['title', 'location', 'description', 'cuisineIds'] as const
export type RestaurantField = (typeof restaurantFields)[number]

// Same messages as the server.
function validateText(value: string, max: number, emptyMessage: string, tooLongMessage: string) {
  const text = value.trim()
  if (!text) return emptyMessage
  if (text.length > max) return tooLongMessage
  return undefined
}

export function validateRestaurant(input: RestaurantInput): FormErrors<RestaurantField> {
  const { title, location, description, minCuisines, maxCuisines } = restaurantLimits
  const cuisineCount = new Set(input.cuisineIds).size
  return {
    title: validateText(input.title, title, 'Enter a title.', `Title must be ${title} characters or fewer.`),
    location: validateText(
      input.location,
      location,
      'Enter a location.',
      `Location must be ${location} characters or fewer.`,
    ),
    description: validateText(
      input.description,
      description,
      'Enter a description.',
      'Description must be 2,000 characters or fewer.',
    ),
    cuisineIds:
      cuisineCount < minCuisines || cuisineCount > maxCuisines
        ? `Choose ${minCuisines} to ${maxCuisines} cuisines.`
        : undefined,
  }
}
