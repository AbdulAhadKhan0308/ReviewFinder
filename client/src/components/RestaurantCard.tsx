import { Link as RouterLink } from 'react-router'
import { Card, CardActionArea, CardContent, CardMedia, Stack, Typography } from '@mui/material'
import PlaceOutlinedIcon from '@mui/icons-material/PlaceOutlined'
import type { RestaurantSummary } from '../api/restaurants'
import { defaultRestaurantImage, formatRating } from '../restaurants/format'
import { CuisineChips } from './CuisineChips'

export function RestaurantCard({ restaurant }: { restaurant: RestaurantSummary }) {
  return (
    <Card variant="outlined" sx={{ height: '100%' }}>
      <CardActionArea
        component={RouterLink}
        to={`/restaurants/${restaurant.id}`}
        sx={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'stretch' }}
      >
        <CardMedia
          component="img"
          image={restaurant.imageUrl ?? defaultRestaurantImage}
          alt=""
          sx={{ aspectRatio: '16 / 9', objectFit: 'cover' }}
        />
        <CardContent sx={{ flexGrow: 1 }}>
          <Stack spacing={1}>
            <Typography variant="h6" component="h2" sx={{ overflowWrap: 'anywhere' }}>
              {restaurant.title}
            </Typography>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ display: 'flex', alignItems: 'center', gap: 0.5, overflowWrap: 'anywhere' }}
            >
              <PlaceOutlinedIcon fontSize="small" aria-hidden />
              {restaurant.location}
            </Typography>
            <CuisineChips cuisines={restaurant.cuisines} />
            <Typography variant="body2">{formatRating(restaurant.averageRating, restaurant.reviewCount)}</Typography>
          </Stack>
        </CardContent>
      </CardActionArea>
    </Card>
  )
}
