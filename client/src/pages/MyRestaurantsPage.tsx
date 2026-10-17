import { useEffect } from 'react'
import { Link as RouterLink, useSearchParams } from 'react-router'
import { Box, Button, CircularProgress, Pagination, Paper, Stack, Typography } from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import { readPage } from '../api/paging'
import { myRestaurantsPath, type Page, type RestaurantSummary } from '../api/restaurants'
import { useApiQuery } from '../api/useApiQuery'
import { LoadError } from '../components/LoadError'
import { RestaurantCard } from '../components/RestaurantCard'

const pageSize = 12

export default function MyRestaurantsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const page = readPage(searchParams.get('page'))
  const query = useApiQuery<Page<RestaurantSummary>>(myRestaurantsPath(page, pageSize))

  const totalCount = query.status === 'success' ? query.data.totalCount : 0
  const pageCount = Math.ceil(totalCount / pageSize)
  const pastLastPage = query.status === 'success' && query.data.items.length === 0 && page > 1

  // A page can become empty, for example after deleting its last restaurant; show the last page that has any.
  useEffect(() => {
    if (pastLastPage) setSearchParams(pageCount > 1 ? { page: String(pageCount) } : {}, { replace: true })
  }, [pastLastPage, pageCount, setSearchParams])

  const addButton = (
    <Button component={RouterLink} to="/restaurants/new" variant="contained" startIcon={<AddIcon />}>
      Add restaurant
    </Button>
  )

  return (
    <>
      <Stack direction="row" sx={{ mb: 3, alignItems: 'center', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
        <Typography variant="h4" component="h1">
          My restaurants
        </Typography>
        {query.status === 'success' && totalCount > 0 && addButton}
      </Stack>

      {query.status === 'error' && (
        <LoadError message="Couldn't load your restaurants." error={query.error} onRetry={query.reload} />
      )}

      {(query.status === 'loading' || pastLastPage) && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress aria-label="Loading restaurants" />
        </Box>
      )}

      {query.status === 'success' && totalCount === 0 && (
        <Paper variant="outlined" sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h6" component="h2" sx={{ mb: 1 }}>
            No restaurants yet
          </Typography>
          <Typography color="text.secondary" sx={{ mb: 3 }}>
            Add your first restaurant so reviewers can find it.
          </Typography>
          {addButton}
        </Paper>
      )}

      {query.status === 'success' && query.data.items.length > 0 && (
        <>
          <Box
            component="ul"
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' },
              gap: 2,
              m: 0,
              p: 0,
              listStyle: 'none',
            }}
          >
            {query.data.items.map((restaurant) => (
              <li key={restaurant.id}>
                <RestaurantCard restaurant={restaurant} />
              </li>
            ))}
          </Box>
          {pageCount > 1 && (
            <Pagination
              sx={{ mt: 3, display: 'flex', justifyContent: 'center' }}
              count={pageCount}
              page={page}
              onChange={(_, next) => setSearchParams(next > 1 ? { page: String(next) } : {})}
            />
          )}
        </>
      )}
    </>
  )
}
