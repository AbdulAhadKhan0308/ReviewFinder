import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router'
import {
  Box,
  Button,
  Checkbox,
  CircularProgress,
  Divider,
  FormControlLabel,
  LinearProgress,
  Pagination,
  Paper,
  Snackbar,
  Stack,
  Typography,
} from '@mui/material'
import RateReviewOutlinedIcon from '@mui/icons-material/RateReviewOutlined'
import { readPage } from '../../api/paging'
import type { Page, RestaurantDetail } from '../../api/restaurants'
import { createReview, reviewsListPath, type Review } from '../../api/reviews'
import { useApiQuery } from '../../api/useApiQuery'
import {
  emptyReviewFilters,
  hasActiveFilters,
  readReviewFilters,
  reviewsApiQuery,
  writeReviewFilters,
  type ReviewFilters,
} from '../../reviews/filters'
import { LoadError } from '../LoadError'
import { ReviewFilterBar } from './ReviewFilterBar'
import { ReviewForm } from './ReviewForm'
import { ReviewItem } from './ReviewItem'

const pageSize = 10

type Props = {
  restaurant: RestaurantDetail
  canWrite: boolean
  // Called after a review is added, changed or deleted, so the restaurant's rating can be reloaded.
  onChanged: () => void
}

// Filters and sort live in the page URL, so refresh, Back and shared links keep them,
// while each restaurant's reviews start unfiltered.
export function ReviewsSection({ restaurant, canWrite, onChanged }: Props) {
  const [searchParams, setSearchParams] = useSearchParams()
  const filters = readReviewFilters(searchParams)
  const page = readPage(searchParams.get('page'))
  const query = useApiQuery<Page<Review>>(reviewsListPath(restaurant.id, reviewsApiQuery(filters, page, pageSize)))
  const [notice, setNotice] = useState<string | null>(null)
  console.log("@@@ ReviewsSection");
  
  const data = query.status === 'success' ? query.data : query.status === 'loading' ? query.previous : undefined
  const filtered = hasActiveFilters(filters)
  const pageCount = Math.ceil((data?.totalCount ?? 0) / pageSize)
  const pastLastPage = query.status === 'success' && query.data.items.length === 0 && page > 1

  // A page can become empty, for example after deleting its last review; show the last page that has any.
  useEffect(() => {
    if (pastLastPage) setSearchParams(writeReviewFilters(filters, Math.max(pageCount, 1)), { replace: true })
  }, [pastLastPage, pageCount, filters, setSearchParams])

  function applyFilters(next: ReviewFilters) {
    setSearchParams(writeReviewFilters(next, 1), { replace: true })
  }

  function handleChanged(message: string, toFirstPage = false) {
    setNotice(message)
    onChanged()
    if (toFirstPage && page !== 1) setSearchParams(writeReviewFilters(filters, 1))
    else query.refresh()
  }

  return (
    <Box component="section" aria-labelledby="reviews-heading">
      <Typography variant="h5" component="h2" id="reviews-heading" sx={{ mb: 2 }}>
        Reviews
      </Typography>

      <Stack spacing={3}>
        {canWrite && <WriteReview restaurantId={restaurant.id} onPosted={() => handleChanged('Your review was posted.', true)} />}

        {(restaurant.reviewCount > 0 || filtered) && (
          <ReviewFilterBar filters={filters} onChange={applyFilters} />
        )}

        {"checkbox"}
        <FormControlLabel label="see my review only" 
        control={<Checkbox checked={filters.mine === 1}
        onChange={
          (e)=>applyFilters({...filters,mine: e.target.checked? 1: 0})
          }/>
        }/>

        {data && restaurant.reviewCount > 0 && (
          <Typography variant="body2" color="text.secondary" aria-live="polite">
            {filtered
              ? `Showing ${data.totalCount} of ${restaurant.reviewCount} ${plural(restaurant.reviewCount)}`
              : `${restaurant.reviewCount} ${plural(restaurant.reviewCount)}`}
          </Typography>
        )}

        {query.status === 'error' && (
          <LoadError message="Couldn't load the reviews." error={query.error} onRetry={query.reload} />
        )}

        {query.status === 'loading' && !data && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress aria-label="Loading reviews" />
          </Box>
        )}

        {data && data.items.length === 0 && !pastLastPage && (
          <Paper variant="outlined" sx={{ p: 3, textAlign: 'center' }}>
            {filtered ? (
              <>
                <Typography sx={{ mb: 2 }}>No reviews match these filters.</Typography>
                <Button onClick={() => applyFilters({ ...emptyReviewFilters, sort: filters.sort })}>Clear filters</Button>
              </>
            ) : (
              <Typography color="text.secondary">
                No reviews yet.{canWrite && ' Be the first to write one.'}
              </Typography>
            )}
          </Paper>
        )}

        {data && data.items.length > 0 && (
          <Box aria-busy={query.status === 'loading'}>
            {/* Keeps the current reviews on screen, dimmed, while the next page or filter loads. */}
            {query.status === 'loading' && <LinearProgress aria-label="Loading reviews" />}
            <Stack
              component="ul"
              divider={<Divider component="li" aria-hidden />}
              sx={{ m: 0, p: 0, listStyle: 'none', opacity: query.status === 'loading' ? 0.6 : 1 }}
            >
              {data.items.map((review) => (
                <ReviewItem key={review.id} review={review} onChanged={(message) => handleChanged(message)} />
              ))}
            </Stack>
            {pageCount > 1 && (
              <Pagination
                sx={{ mt: 2, display: 'flex', justifyContent: 'center' }}
                count={pageCount}
                page={Math.min(page, pageCount)}
                onChange={(_, next) => setSearchParams(writeReviewFilters(filters, next))}
              />
            )}
          </Box>
        )}
      </Stack>

      <Snackbar open={notice !== null} autoHideDuration={4000} onClose={() => setNotice(null)} message={notice} />
    </Box>
  )
}

function WriteReview({ restaurantId, onPosted }: { restaurantId: string; onPosted: () => void }) {
  const [open, setOpen] = useState(false)

  if (!open) {
    return (
      <Box>
        <Button variant="contained" startIcon={<RateReviewOutlinedIcon />} onClick={() => setOpen(true)}>
          Write a review
        </Button>
      </Box>
    )
  }

  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Typography variant="h6" component="h3" sx={{ mb: 2 }}>
        Write a review
      </Typography>
      <ReviewForm
        submitLabel="Post review"
        onCancel={() => setOpen(false)}
        onSubmit={async (input) => {
          await createReview(restaurantId, input)
          setOpen(false)
          onPosted()
        }}
      />
    </Paper>
  )
}

const plural = (count: number) => (count === 1 ? 'review' : 'reviews')
