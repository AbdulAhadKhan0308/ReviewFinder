export const reviewSorts = ['newest', 'oldest', 'ratingDesc', 'ratingAsc'] as const
export type ReviewSort = (typeof reviewSorts)[number]

export const reviewSortLabels: Record<ReviewSort, string> = {
  newest: 'Newest first',
  oldest: 'Oldest first',
  ratingDesc: 'Highest rating first',
  ratingAsc: 'Lowest rating first',
}

export const keywordMaxLength = 100

export type ReviewFilters = {
  keyword: string
  minRating: number | null
  maxRating: number | null
  // Dates as YYYY-MM-DD in the user's time zone, or '' when not set.
  from: string
  to: string
  sort: ReviewSort
}

export const emptyReviewFilters: ReviewFilters = {
  keyword: '',
  minRating: null,
  maxRating: null,
  from: '',
  to: '',
  sort: 'newest',
}

const datePattern = /^(\d{4})-(\d{2})-(\d{2})$/

// Midnight at the start of a YYYY-MM-DD date in the user's time zone, or null if it isn't a real date.
function startOfDay(value: string, addDays = 0) {
  const match = datePattern.exec(value)
  if (!match) return null
  const [year, month, day] = match.slice(1).map(Number)
  const date = new Date(year, month - 1, day + addDays)
  const roundTrip = new Date(year, month - 1, day)
  const valid = roundTrip.getFullYear() === year && roundTrip.getMonth() === month - 1 && roundTrip.getDate() === day
  return valid ? date : null
}

export function today() {
  const now = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

function readRating(value: string | null) {
  const rating = Number(value)
  return value !== null && Number.isInteger(rating) && rating >= 1 && rating <= 5 ? rating : null
}

const readDate = (value: string | null) => (value !== null && startOfDay(value) ? value : '')

// Reads filters from the page URL. Anything invalid, for example from a hand-edited link, is ignored.
export function readReviewFilters(params: URLSearchParams): ReviewFilters {
  const minRating = readRating(params.get('minRating'))
  const maxRating = readRating(params.get('maxRating'))
  const sort = params.get('sort')
  return {
    keyword: (params.get('keyword') ?? '').slice(0, keywordMaxLength),
    minRating,
    maxRating: minRating !== null && maxRating !== null && maxRating < minRating ? null : maxRating,
    from: readDate(params.get('from')),
    to: readDate(params.get('to')),
    sort: reviewSorts.includes(sort as ReviewSort) ? (sort as ReviewSort) : 'newest',
  }
}

// The page URL's query string; defaults are left out to keep links short.
export function writeReviewFilters(filters: ReviewFilters, page: number) {
  const params = new URLSearchParams()
  if (filters.keyword) params.set('keyword', filters.keyword)
  if (filters.minRating !== null) params.set('minRating', String(filters.minRating))
  if (filters.maxRating !== null) params.set('maxRating', String(filters.maxRating))
  if (filters.from) params.set('from', filters.from)
  if (filters.to) params.set('to', filters.to)
  if (filters.sort !== 'newest') params.set('sort', filters.sort)
  if (page > 1) params.set('page', String(page))
  return params
}

export const hasActiveFilters = (filters: ReviewFilters) =>
  filters.keyword.trim() !== '' ||
  filters.minRating !== null ||
  filters.maxRating !== null ||
  filters.from !== '' ||
  filters.to !== ''

export function dateRangeError(filters: ReviewFilters) {
  return filters.from && filters.to && filters.from > filters.to
    ? 'End date must be on or after the start date.'
    : undefined
}

// The API's query string. Chosen dates become the start of each day in the user's time zone,
// with the day after the end date as the exclusive end, so the end date itself is included.
export function reviewsApiQuery(filters: ReviewFilters, page: number, pageSize: number) {
  const params = new URLSearchParams()
  const keyword = filters.keyword.trim()
  if (keyword) params.set('keyword', keyword)
  if (filters.minRating !== null) params.set('minRating', String(filters.minRating))
  if (filters.maxRating !== null) params.set('maxRating', String(filters.maxRating))
  if (!dateRangeError(filters)) {
    const from = startOfDay(filters.from)
    const to = startOfDay(filters.to, 1)
    if (from) params.set('writtenFrom', from.toISOString())
    if (to) params.set('writtenTo', to.toISOString())
  }
  if (filters.sort !== 'newest') params.set('sort', filters.sort)
  params.set('page', String(page))
  params.set('pageSize', String(pageSize))
  return params
}
