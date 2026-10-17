import { useState } from 'react'
import { Link as RouterLink, useNavigate, useParams } from 'react-router'
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Divider,
  Stack,
  Typography,
} from '@mui/material'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import PlaceOutlinedIcon from '@mui/icons-material/PlaceOutlined'
import { isNotFound } from '../api/client'
import { deleteRestaurant, restaurantPath, type RestaurantDetail } from '../api/restaurants'
import { useApiQuery } from '../api/useApiQuery'
import { useAuth } from '../auth/AuthContext'
import { CuisineChips } from '../components/CuisineChips'
import { LoadError } from '../components/LoadError'
import { RestaurantNotFound } from '../components/RestaurantNotFound'
import { ReviewsSection } from '../components/reviews/ReviewsSection'
import { defaultRestaurantImage, formatDate, formatRating } from '../restaurants/format'

export default function RestaurantDetailPage() {
  const { id = '' } = useParams()
  const { user } = useAuth()
  const query = useApiQuery<RestaurantDetail>(restaurantPath(id))
  // Owners can only load their own restaurants, so an owner viewing this page owns it.
  const isOwner = user?.role === 'Owner'

  if (query.status === 'error' && isNotFound(query.error)) return <RestaurantNotFound />

  return (
    <>
      <Button component={RouterLink} to="/" startIcon={<ArrowBackIcon />} sx={{ mb: 2 }}>
        {isOwner ? 'My restaurants' : 'Restaurants'}
      </Button>

      {query.status === 'loading' && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress aria-label="Loading restaurant" />
        </Box>
      )}

      {query.status === 'error' && (
        <LoadError message="Couldn't load the restaurant." error={query.error} onRetry={query.reload} />
      )}

      {query.status === 'success' && (
        <RestaurantDetails restaurant={query.data} isOwner={isOwner} onReviewsChanged={query.refresh} />
      )}
    </>
  )
}

type DetailsProps = {
  restaurant: RestaurantDetail
  isOwner: boolean
  onReviewsChanged: () => void
}

function RestaurantDetails({ restaurant, isOwner, onReviewsChanged }: DetailsProps) {
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  return (
    <Stack spacing={2.5}>
      <Box
        component="img"
        src={restaurant.imageUrl ?? defaultRestaurantImage}
        alt=""
        sx={{
          width: '100%',
          aspectRatio: '16 / 9',
          maxHeight: 360,
          objectFit: 'cover',
          borderRadius: 1,
          bgcolor: 'grey.100',
        }}
      />

      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'flex-start', gap: 2, flexWrap: 'wrap' }}>
        <Typography variant="h4" component="h1" sx={{ overflowWrap: 'anywhere' }}>
          {restaurant.title}
        </Typography>
        {isOwner && (
          <Stack direction="row" spacing={1}>
            <Button
              component={RouterLink}
              to={`/restaurants/${restaurant.id}/edit`}
              variant="outlined"
              startIcon={<EditOutlinedIcon />}
            >
              Edit
            </Button>
            <Button
              variant="outlined"
              color="error"
              startIcon={<DeleteOutlinedIcon />}
              onClick={() => setConfirmingDelete(true)}
            >
              Delete
            </Button>
          </Stack>
        )}
      </Stack>

      <Typography color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, overflowWrap: 'anywhere' }}>
        <PlaceOutlinedIcon fontSize="small" aria-hidden />
        {restaurant.location}
      </Typography>
      <CuisineChips cuisines={restaurant.cuisines} />
      <Typography>{formatRating(restaurant.averageRating, restaurant.reviewCount)}</Typography>
      <Typography sx={{ whiteSpace: 'pre-line', overflowWrap: 'anywhere' }}>{restaurant.description}</Typography>
      <Typography variant="caption" color="text.secondary">
        Added {formatDate(restaurant.createdAt)}
        {restaurant.updatedAt !== restaurant.createdAt && ` · Updated ${formatDate(restaurant.updatedAt)}`}
      </Typography>

      <Divider />
      {/* Owners can't write reviews, including on their own restaurants. */}
      <ReviewsSection key={restaurant.id} restaurant={restaurant} canWrite={!isOwner} onChanged={onReviewsChanged} />

      {confirmingDelete && <DeleteDialog restaurant={restaurant} onClose={() => setConfirmingDelete(false)} />}
    </Stack>
  )
}

function DeleteDialog({ restaurant, onClose }: { restaurant: RestaurantDetail; onClose: () => void }) {
  const navigate = useNavigate()
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleDelete() {
    setDeleting(true)
    setError(null)
    try {
      await deleteRestaurant(restaurant.id)
    } catch (err) {
      // Already gone counts as deleted.
      if (!isNotFound(err)) {
        setError(err instanceof Error ? err.message : 'Deleting failed. Please try again.')
        setDeleting(false)
        return
      }
    }
    navigate('/', { replace: true })
  }

  return (
    <Dialog open onClose={deleting ? undefined : onClose} aria-labelledby="delete-title">
      <DialogTitle id="delete-title">Delete this restaurant?</DialogTitle>
      <DialogContent>
        <Stack spacing={2}>
          {error && <Alert severity="error">{error}</Alert>}
          <DialogContentText>
            “{restaurant.title}” and its reviews will be permanently deleted. This can't be undone.
          </DialogContentText>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={deleting}>
          Cancel
        </Button>
        <Button color="error" variant="contained" onClick={handleDelete} loading={deleting}>
          Delete
        </Button>
      </DialogActions>
    </Dialog>
  )
}
