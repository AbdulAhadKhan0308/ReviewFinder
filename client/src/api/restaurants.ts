import { apiFetch } from './client'

export type Cuisine = { id: string; name: string }

export type Page<T> = { items: T[]; page: number; pageSize: number; totalCount: number }

export type RestaurantSummary = {
  id: string
  title: string
  imageUrl: string | null
  location: string
  cuisines: Cuisine[]
  // null when the restaurant has no reviews.
  averageRating: number | null
  reviewCount: number
}

export type RestaurantDetail = RestaurantSummary & {
  description: string
  createdAt: string
  updatedAt: string
}

export type RestaurantInput = {
  title: string
  location: string
  description: string
  cuisineIds: string[]
}

export const restaurantPath = (id: string) => `/api/restaurants/${encodeURIComponent(id)}`

export const myRestaurantsPath = (page: number, pageSize: number) =>
  `/api/me/restaurants?page=${page}&pageSize=${pageSize}`

export const createRestaurant = (input: RestaurantInput) =>
  apiFetch<RestaurantDetail>('/api/restaurants', { method: 'POST', body: input })

export const updateRestaurant = (id: string, input: RestaurantInput) =>
  apiFetch<RestaurantDetail>(restaurantPath(id), { method: 'PUT', body: input })

export const deleteRestaurant = (id: string) => apiFetch<void>(restaurantPath(id), { method: 'DELETE' })
