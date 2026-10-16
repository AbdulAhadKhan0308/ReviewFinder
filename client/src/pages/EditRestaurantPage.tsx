import { useParams } from 'react-router'
import { Box, CircularProgress, Typography } from '@mui/material'
import { isNotFound } from '../api/client'
import { restaurantPath, updateRestaurant, type Cuisine, type RestaurantDetail } from '../api/restaurants'
import { useApiQuery } from '../api/useApiQuery'
import { LoadError } from '../components/LoadError'
import { RestaurantForm } from '../components/RestaurantForm'
import { RestaurantNotFound } from '../components/RestaurantNotFound'

export default function EditRestaurantPage() {
  const { id = '' } = useParams()
  const cuisines = useApiQuery<Cuisine[]>('/api/cuisines')
  const restaurant = useApiQuery<RestaurantDetail>(restaurantPath(id))

  if (restaurant.status === 'error' && isNotFound(restaurant.error)) return <RestaurantNotFound />

  const failed = [cuisines, restaurant].find((q) => q.status === 'error')

  return (
    <>
      <Typography variant="h4" component="h1" sx={{ mb: 3 }}>
        Edit restaurant
      </Typography>
      {failed?.status === 'error' && (
        <LoadError
          message="Couldn't load the restaurant."
          error={failed.error}
          onRetry={() => {
            cuisines.reload()
            restaurant.reload()
          }}
        />
      )}
      {!failed && (cuisines.status === 'loading' || restaurant.status === 'loading') && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress aria-label="Loading" />
        </Box>
      )}
      {cuisines.status === 'success' && restaurant.status === 'success' && (
        <RestaurantForm
          // A new key resets the form if the page switches to a different restaurant.
          key={restaurant.data.id}
          cuisines={cuisines.data}
          initial={restaurant.data}
          submitLabel="Save changes"
          cancelTo={`/restaurants/${restaurant.data.id}`}
          onSubmit={(input) => updateRestaurant(restaurant.data.id, input)}
        />
      )}
    </>
  )
}
