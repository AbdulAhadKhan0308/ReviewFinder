import { Box, CircularProgress, Typography } from '@mui/material'
import { createRestaurant, type Cuisine } from '../api/restaurants'
import { useApiQuery } from '../api/useApiQuery'
import { LoadError } from '../components/LoadError'
import { RestaurantForm } from '../components/RestaurantForm'

export default function NewRestaurantPage() {
  const cuisines = useApiQuery<Cuisine[]>('/api/cuisines')

  return (
    <>
      <Typography variant="h4" component="h1" sx={{ mb: 3 }}>
        Add a restaurant
      </Typography>
      {cuisines.status === 'loading' && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress aria-label="Loading" />
        </Box>
      )}
      {cuisines.status === 'error' && (
        <LoadError message="Couldn't load the form." error={cuisines.error} onRetry={cuisines.reload} />
      )}
      {cuisines.status === 'success' && (
        <RestaurantForm cuisines={cuisines.data} submitLabel="Add restaurant" cancelTo="/" onSubmit={createRestaurant} />
      )}
    </>
  )
}
