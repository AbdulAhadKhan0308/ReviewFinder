import { Button, InputAdornment, MenuItem, Stack, TextField } from '@mui/material'
import FilterListOffIcon from '@mui/icons-material/FilterListOff'
import SearchIcon from '@mui/icons-material/Search'
import { useFilterDraft } from '../../filters/useFilterDraft'
import {
  dateRangeError,
  emptyReviewFilters,
  hasActiveFilters,
  keywordMaxLength,
  reviewSortLabels,
  reviewSorts,
  today,
  writeReviewFilters,
  type ReviewFilters,
  type ReviewSort,
} from '../../reviews/filters'

type Props = {
  filters: ReviewFilters
  onChange: (filters: ReviewFilters) => void
}

const ratings = [1, 2, 3, 4, 5]
const keyOf = (filters: ReviewFilters) => writeReviewFilters(filters, 1).toString()
const readRating = (value: unknown) => (value === '' ? null : Number(value))

export function ReviewFilterBar({ filters, onChange }: Props) {
  const { draft, updateLater, updateNow } = useFilterDraft({ filters, keyOf, onChange })

  const dateError = dateRangeError(draft)
  const maxDate = today()

  return (
    <Stack spacing={2}>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <TextField
          type="search"
          label="Search reviews"
          size="small"
          value={draft.keyword}
          onChange={(e) => updateLater({ ...draft, keyword: e.target.value })}
          sx={{ flexGrow: 1 }}
          slotProps={{
            htmlInput: { maxLength: keywordMaxLength },
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
          onChange={(e) => updateNow({ ...draft, sort: e.target.value as ReviewSort })}
          sx={{ minWidth: 200 }}
        >
          {reviewSorts.map((sort) => (
            <MenuItem key={sort} value={sort}>
              {reviewSortLabels[sort]}
            </MenuItem>
          ))}
        </TextField>
      </Stack>

      <Stack direction="row" spacing={2} useFlexGap sx={{ flexWrap: 'wrap', alignItems: 'flex-start' }}>
        <TextField
          select
          label="Min rating"
          size="small"
          value={draft.minRating ?? ''}
          onChange={(e) => updateNow({ ...draft, minRating: readRating(e.target.value) })}
          sx={{ minWidth: 120 }}
          slotProps={{ inputLabel: { shrink: true }, select: { displayEmpty: true } }}
        >
          <MenuItem value="">Any</MenuItem>
          {ratings.map((n) => (
            <MenuItem key={n} value={n} disabled={draft.maxRating !== null && n > draft.maxRating}>
              {n} ★
            </MenuItem>
          ))}
        </TextField>
        <TextField
          select
          label="Max rating"
          size="small"
          value={draft.maxRating ?? ''}
          onChange={(e) => updateNow({ ...draft, maxRating: readRating(e.target.value) })}
          sx={{ minWidth: 120 }}
          slotProps={{ inputLabel: { shrink: true }, select: { displayEmpty: true } }}
        >
          <MenuItem value="">Any</MenuItem>
          {ratings.map((n) => (
            <MenuItem key={n} value={n} disabled={draft.minRating !== null && n < draft.minRating}>
              {n} ★
            </MenuItem>
          ))}
        </TextField>
        <TextField
          type="date"
          label="Written from"
          size="small"
          value={draft.from}
          onChange={(e) => updateNow({ ...draft, from: e.target.value })}
          slotProps={{ inputLabel: { shrink: true }, htmlInput: { max: draft.to || maxDate } }}
        />
        <TextField
          type="date"
          label="Written to"
          size="small"
          value={draft.to}
          onChange={(e) => updateNow({ ...draft, to: e.target.value })}
          error={Boolean(dateError)}
          helperText={dateError}
          slotProps={{ inputLabel: { shrink: true }, htmlInput: { min: draft.from || undefined, max: maxDate } }}
        />
        {hasActiveFilters(draft) && (
          <Button
            startIcon={<FilterListOffIcon />}
            onClick={() => updateNow({ ...emptyReviewFilters, sort: draft.sort })}
            sx={{ alignSelf: 'center' }}
          >
            Clear filters
          </Button>
        )}
      </Stack>
    </Stack>
  )
}
