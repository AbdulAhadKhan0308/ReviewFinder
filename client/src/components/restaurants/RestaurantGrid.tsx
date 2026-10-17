import { Box } from '@mui/material'
import type { RestaurantSummary } from '../../api/restaurants'
import { RestaurantCard } from '../RestaurantCard'

// 1, 2 or 3 columns depending on screen width; a page of 12 always fills its last row.
export function RestaurantGrid({ restaurants }: { restaurants: RestaurantSummary[] }) {
  return (
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
      {restaurants.map((restaurant) => (
        <li key={restaurant.id}>
          <RestaurantCard restaurant={restaurant} />
        </li>
      ))}
    </Box>
  )
}
