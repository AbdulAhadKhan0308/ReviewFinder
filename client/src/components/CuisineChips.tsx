import { Box, Chip } from '@mui/material'
import type { Cuisine } from '../api/restaurants'

export function CuisineChips({ cuisines }: { cuisines: Cuisine[] }) {
  return (
    <Box component="ul" aria-label="Cuisines" sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, m: 0, p: 0, listStyle: 'none' }}>
      {cuisines.map((cuisine) => (
        <li key={cuisine.id}>
          <Chip label={cuisine.name} size="small" />
        </li>
      ))}
    </Box>
  )
}
