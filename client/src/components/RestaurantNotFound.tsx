import { Link as RouterLink } from 'react-router'
import { Button, Paper, Typography } from '@mui/material'

// Shown when a restaurant doesn't exist or the user isn't allowed to see it; the API answers both with 404.
export function RestaurantNotFound() {
  return (
    <Paper variant="outlined" sx={{ p: 4, textAlign: 'center' }}>
      <Typography variant="h5" component="h1" sx={{ mb: 1 }}>
        Restaurant not found
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        It may have been deleted, or the link may be wrong.
      </Typography>
      <Button component={RouterLink} to="/" variant="contained">
        Go to the home page
      </Button>
    </Paper>
  )
}
