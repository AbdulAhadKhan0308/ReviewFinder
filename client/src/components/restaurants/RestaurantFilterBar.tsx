import {
  Button,
  Checkbox,
  InputAdornment,
  ListItemText,
  MenuItem,
  Stack,
  TextField,
} from '@mui/material'
import FilterListOffIcon from '@mui/icons-material/FilterListOff'
import SearchIcon from '@mui/icons-material/Search'
import type { Cuisine } from '../../api/restaurants'
import { useFilterDraft } from '../../filters/useFilterDraft'
import {
  emptyRestaurantFilters,
  hasActiveFilters,
  ratingErrors,
  restaurantKeywordMaxLength,
  restaurantSortLabels,
  restaurantSorts,
  toAppliedRestaurantFilters,
  writeRestaurantFilters,
  type RestaurantFilters,
  type RestaurantSort,
} from '../../restaurants/filters'

type Props = {
  filters: RestaurantFilters
  onChange: (filters: RestaurantFilters) => void
  // Undefined while the cuisine list is loading or if it couldn't be loaded.
  cuisines: Cuisine[] | undefined
}

const keyOf = (filters: RestaurantFilters) => writeRestaurantFilters(filters, 1).toString()

export function RestaurantFilterBar({ filters, onChange, cuisines }: Props) {
  const { draft, updateLater, updateNow } = useFilterDraft({
    filters,
    keyOf,
    onChange,
    toApplied: toAppliedRestaurantFilters,
  })
  const errors = ratingErrors(draft)
  const cuisineName = (id: string) => cuisines?.find((c) => c.id === id)?.name

  return (
    <Stack spacing={2}>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <TextField
          type="search"
          label="Search restaurants"
          placeholder="Name, location or description"
          size="small"
          value={draft.keyword}
          onChange={(e) => updateLater({ ...draft, keyword: e.target.value })}
          sx={{ flexGrow: 1 }}
          slotProps={{
            htmlInput: { maxLength: restaurantKeywordMaxLength },
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            },
          }}
        />
        <TextField
          select
          label="Sort by"
          size="small"
          value={draft.sort}
          onChange={(e) => updateNow({ ...draft, sort: e.target.value as RestaurantSort })}
          sx={{ minWidth: 200 }}
        >
          {restaurantSorts.map((sort) => (
            <MenuItem key={sort} value={sort}>
              {restaurantSortLabels[sort]}
            </MenuItem>
          ))}
        </TextField>
      </Stack>

      <Stack direction="row" spacing={2} useFlexGap sx={{ flexWrap: 'wrap', alignItems: 'flex-start' }}>
        <TextField
          select
          label="Cuisines"
          size="small"
          value={draft.cuisineIds}
          onChange={(e) => {
            const value = e.target.value as unknown as string[] | string
            updateNow({ ...draft, cuisineIds: typeof value === 'string' ? value.split(',') : value })
          }}
          disabled={!cuisines}
          helperText="Restaurants with all selected cuisines"
          sx={{ width: { xs: '100%', sm: 260 } }}
          slotProps={{
            inputLabel: { shrink: true },
            select: {
              multiple: true,
              displayEmpty: true,
              renderValue: (selected) => {
                const names = (selected as string[]).map(cuisineName).filter(Boolean)
                return names.length > 0 ? names.join(', ') : 'Any'
              },
            },
          }}
        >
          {(cuisines ?? []).map((cuisine) => (
            <MenuItem key={cuisine.id} value={cuisine.id} dense>
              <Checkbox size="small" checked={draft.cuisineIds.includes(cuisine.id)} sx={{ p: 0.5, mr: 1 }} />
              <ListItemText primary={cuisine.name} />
            </MenuItem>
          ))}
        </TextField>
        <TextField
          label="Min rating"
          placeholder="1"
          size="small"
          value={draft.minRating}
          onChange={(e) => updateLater({ ...draft, minRating: e.target.value })}
          error={Boolean(errors.minRating)}
          helperText={errors.minRating ?? '1 to 5'}
          sx={{ width: 130 }}
          slotProps={{ inputLabel: { shrink: true }, htmlInput: { inputMode: 'decimal', maxLength: 6 } }}
        />
        <TextField
          label="Max rating"
          placeholder="5"
          size="small"
          value={draft.maxRating}
          onChange={(e) => updateLater({ ...draft, maxRating: e.target.value })}
          error={Boolean(errors.maxRating)}
          helperText={errors.maxRating ?? '1 to 5'}
          sx={{ width: 130 }}
          slotProps={{ inputLabel: { shrink: true }, htmlInput: { inputMode: 'decimal', maxLength: 6 } }}
        />
        {hasActiveFilters(draft) && (
          <Button
            startIcon={<FilterListOffIcon />}
            onClick={() => updateNow({ ...emptyRestaurantFilters, sort: draft.sort })}
            sx={{ mt: 0.5 }}
          >
            Clear filters
          </Button>
        )}
      </Stack>
    </Stack>
  )
}
