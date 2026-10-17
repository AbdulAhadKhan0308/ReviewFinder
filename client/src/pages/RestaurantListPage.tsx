import { useEffect } from 'react'
import { Navigate, useSearchParams } from 'react-router'
import { Box, Button, CircularProgress, LinearProgress, Pagination, Paper, Stack, Typography } from '@mui/material'
import { readPage } from '../api/paging'
import { restaurantsListPath, type Cuisine, type Page, type RestaurantSummary } from '../api/restaurants'
import { useApiQuery } from '../api/useApiQuery'
import { useAuth } from '../auth/AuthContext'
import { LoadError } from '../components/LoadError'
import { RestaurantFilterBar } from '../components/restaurants/RestaurantFilterBar'
import { RestaurantGrid } from '../components/restaurants/RestaurantGrid'
import {
  emptyRestaurantFilters,
  hasActiveFilters,
  loadSavedRestaurantFilters,
  readRestaurantFilters,
  restaurantsApiQuery,
  saveRestaurantFilters,
  writeRestaurantFilters,
  type RestaurantFilters,
} from '../restaurants/filters'

const pageSize = 12

// The reviewer's home page. Filters and sort live in the page URL while browsing, and are remembered in
// the browser per account, so returning to the plain home page restores them.
export default function RestaurantListPage() {
  const { user } = useAuth()
  const [searchParams] = useSearchParams()
  if (!user) return null

  if (searchParams.toString() === '') {
    const saved = loadSavedRestaurantFilters(user.id)
    if (saved) return <Navigate to={{ search: `?${saved}` }} replace />
  }

  return <RestaurantList userId={user.id} />
}

function RestaurantList({ userId }: { userId: string }) {
  const [searchParams, setSearchParams] = useSearchParams()
  const filters = readRestaurantFilters(searchParams)
  const page = readPage(searchParams.get('page'))
  const query = useApiQuery<Page<RestaurantSummary>>(restaurantsListPath(restaurantsApiQuery(filters, page, pageSize)))
  const cuisines = useApiQuery<Cuisine[]>('/api/cuisines')

  const filtersKey = writeRestaurantFilters(filters, 1).toString()
  const data = query.status === 'success' ? query.data : query.status === 'loading' ? query.previous : undefined
  const filtered = hasActiveFilters(filters)
  const pageCount = Math.ceil((data?.totalCount ?? 0) / pageSize)
  const pastLastPage = query.status === 'success' && query.data.items.length === 0 && page > 1

  // Also remembers filters reached by Back or Forward, not only ones chosen in the filter bar.
  useEffect(() => {
    saveRestaurantFilters(userId, readRestaurantFilters(new URLSearchParams(filtersKey)))
  }, [userId, filtersKey])

  // A page can become empty, for example after a restaurant was deleted; show the last page that has any.
  useEffect(() => {
    if (!pastLastPage) return
    const current = readRestaurantFilters(new URLSearchParams(filtersKey))
    setSearchParams(writeRestaurantFilters(current, Math.max(pageCount, 1)), { replace: true })
  }, [pastLastPage, pageCount, filtersKey, setSearchParams])

  function applyFilters(next: RestaurantFilters) {
    // Saved before the URL changes, so clearing the filters isn't undone by restoring the previous ones.
    saveRestaurantFilters(userId, next)
    setSearchParams(writeRestaurantFilters(next, 1), { replace: true })
  }

  const clearFilters = () => applyFilters({ ...emptyRestaurantFilters, sort: filters.sort })

  return (
    <>
      <Typography variant="h4" component="h1" sx={{ mb: 3 }}>
        Restaurants
      </Typography>

      <Stack spacing={3}>
        {cuisines.status === 'error' && (
          <LoadError message="Couldn't load the cuisine filter." error={cuisines.error} onRetry={cuisines.reload} />
        )}
        <RestaurantFilterBar
          filters={filters}
          onChange={applyFilters}
          cuisines={cuisines.status === 'success' ? cuisines.data : undefined}
        />

        {data && data.totalCount > 0 && (
          <Typography variant="body2" color="text.secondary" aria-live="polite">
            {data.totalCount} {data.totalCount === 1 ? 'restaurant' : 'restaurants'}
            {filtered && (data.totalCount === 1 ? ' matches your filters' : ' match your filters')}
          </Typography>
        )}

        {query.status === 'error' && (
          <LoadError message="Couldn't load the restaurants." error={query.error} onRetry={query.reload} />
        )}

        {((query.status === 'loading' && !data) || pastLastPage) && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
            <CircularProgress aria-label="Loading restaurants" />
          </Box>
        )}

        {data && data.totalCount === 0 && (
          <Paper variant="outlined" sx={{ p: 4, textAlign: 'center' }}>
            {filtered ? (
              <>
                <Typography variant="h6" component="h2" sx={{ mb: 1 }}>
                  No restaurants match these filters
                </Typography>
                <Typography color="text.secondary" sx={{ mb: 3 }}>
                  Try a different search, fewer cuisines or a wider rating range.
                </Typography>
                <Button variant="contained" onClick={clearFilters}>
                  Clear filters
                </Button>
              </>
            ) : (
              <>
                <Typography variant="h6" component="h2" sx={{ mb: 1 }}>
                  No restaurants yet
                </Typography>
                <Typography color="text.secondary">Check back soon.</Typography>
              </>
            )}
          </Paper>
        )}

        {data && data.items.length > 0 && !pastLastPage && (
          <Box aria-busy={query.status === 'loading'}>
            {/* Keeps the current results on screen, dimmed, while the next page or filter loads. */}
            {query.status === 'loading' && <LinearProgress aria-label="Loading restaurants" sx={{ mb: 1 }} />}
            <Box sx={{ opacity: query.status === 'loading' ? 0.6 : 1 }}>
              <RestaurantGrid restaurants={data.items} />
            </Box>
            {pageCount > 1 && (
              <Pagination
                sx={{ mt: 3, display: 'flex', justifyContent: 'center' }}
                count={pageCount}
                page={Math.min(page, pageCount)}
                onChange={(_, next) => setSearchParams(writeRestaurantFilters(filters, next))}
              />
            )}
          </Box>
        )}
      </Stack>
    </>
  )
}
