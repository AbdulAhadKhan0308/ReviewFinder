export const restaurantSorts = ['ratingDesc', 'ratingAsc'] as const
export type RestaurantSort = (typeof restaurantSorts)[number]

export const restaurantSortLabels: Record<RestaurantSort, string> = {
  ratingDesc: 'Highest rated first',
  ratingAsc: 'Lowest rated first',
}

export const restaurantKeywordMaxLength = 100

export type RestaurantFilters = {
  keyword: string
  cuisineIds: string[]
  // Ratings as typed, '' when not set. Applied filters always hold valid values.
  minRating: string
  maxRating: string
  sort: RestaurantSort
}

export const emptyRestaurantFilters: RestaurantFilters = {
  keyword: '',
  cuisineIds: [],
  minRating: '',
  maxRating: '',
  sort: 'ratingDesc',
}

const guidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const numberPattern = /^\d+(\.\d+)?$/
const twoDecimalsPattern = /^\d+(\.\d{1,2})?$/

// Same rules as the server: 1 to 5, inclusive, with up to 2 decimal places.
function ratingError(value: string) {
  const text = value.trim()
  if (!text) return undefined
  if (!numberPattern.test(text) || Number(text) < 1 || Number(text) > 5) return 'Enter 1 to 5.'
  if (!twoDecimalsPattern.test(text)) return 'Use up to 2 decimals.'
  return undefined
}

export function ratingErrors(filters: RestaurantFilters) {
  const minRating = ratingError(filters.minRating)
  const maxRating = ratingError(filters.maxRating)
  const min = filters.minRating.trim()
  const max = filters.maxRating.trim()
  if (!minRating && !maxRating && min && max && Number(min) > Number(max)) {
    return { minRating: undefined, maxRating: "Can't be below the minimum." }
  }
  return { minRating, maxRating }
}

const readRating = (value: string | null) => (value !== null && !ratingError(value) ? value.trim() : '')

// Reads filters from the page URL. Anything invalid, for example from a hand-edited link, is ignored.
export function readRestaurantFilters(params: URLSearchParams): RestaurantFilters {
  const cuisineIds = [...new Set(params.getAll('cuisineIds').map((id) => id.toLowerCase()))]
    .filter((id) => guidPattern.test(id))
    .sort()
    .slice(0, 20)
  const minRating = readRating(params.get('minRating'))
  const maxRating = readRating(params.get('maxRating'))
  const sort = params.get('sort')
  return {
    keyword: (params.get('keyword') ?? '').slice(0, restaurantKeywordMaxLength),
    cuisineIds,
    minRating,
    maxRating: minRating && maxRating && Number(minRating) > Number(maxRating) ? '' : maxRating,
    sort: restaurantSorts.includes(sort as RestaurantSort) ? (sort as RestaurantSort) : 'ratingDesc',
  }
}

// The page URL's query string; defaults are left out to keep links short.
export function writeRestaurantFilters(filters: RestaurantFilters, page: number) {
  const params = new URLSearchParams()
  if (filters.keyword) params.set('keyword', filters.keyword)
  for (const id of [...filters.cuisineIds].sort()) params.append('cuisineIds', id)
  if (filters.minRating) params.set('minRating', filters.minRating)
  if (filters.maxRating) params.set('maxRating', filters.maxRating)
  if (filters.sort !== 'ratingDesc') params.set('sort', filters.sort)
  if (page > 1) params.set('page', String(page))
  return params
}

export const hasActiveFilters = (filters: RestaurantFilters) =>
  filters.keyword.trim() !== '' ||
  filters.cuisineIds.length > 0 ||
  filters.minRating.trim() !== '' ||
  filters.maxRating.trim() !== ''

// While a rating being typed is invalid, the last applied rating range stays in effect.
export function toAppliedRestaurantFilters(draft: RestaurantFilters, applied: RestaurantFilters): RestaurantFilters {
  const errors = ratingErrors(draft)
  return errors.minRating || errors.maxRating
    ? { ...draft, minRating: applied.minRating, maxRating: applied.maxRating }
    : { ...draft, minRating: draft.minRating.trim(), maxRating: draft.maxRating.trim() }
}

export function restaurantsApiQuery(filters: RestaurantFilters, page: number, pageSize: number) {
  const params = writeRestaurantFilters({ ...filters, keyword: filters.keyword.trim() }, 1)
  params.set('page', String(page))
  params.set('pageSize', String(pageSize))
  return params
}

// Filters and sort are remembered in this browser, separately for each account (Q10). The page number isn't.
const storageKey = (userId: string) => `restaurant-filters:${userId}`

export function loadSavedRestaurantFilters(userId: string) {
  try {
    const saved = localStorage.getItem(storageKey(userId))
    return saved ? writeRestaurantFilters(readRestaurantFilters(new URLSearchParams(saved)), 1).toString() : ''
  } catch {
    // Storage can be unavailable, for example when the browser blocks it; nothing is restored then.
    return ''
  }
}

export function saveRestaurantFilters(userId: string, filters: RestaurantFilters) {
  try {
    const query = writeRestaurantFilters(filters, 1).toString()
    if (query) localStorage.setItem(storageKey(userId), query)
    else localStorage.removeItem(storageKey(userId))
  } catch {
    // As above: the filters still work, they just aren't remembered.
  }
}
