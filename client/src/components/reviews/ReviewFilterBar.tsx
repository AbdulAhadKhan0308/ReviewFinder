import { useEffect, useRef, useState } from 'react'
import { Button, InputAdornment, MenuItem, Stack, TextField } from '@mui/material'
import FilterListOffIcon from '@mui/icons-material/FilterListOff'
import SearchIcon from '@mui/icons-material/Search'
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
const keywordDelayMs = 400
const keyOf = (filters: ReviewFilters) => writeReviewFilters(filters, 1).toString()
const readRating = (value: unknown) => (value === '' ? null : Number(value))

export function ReviewFilterBar({ filters, onChange }: Props) {
  // The inputs show a local copy that updates instantly. The URL, and so the filters prop, update a
  // moment later; binding the inputs to it directly would briefly reset a date while it's being typed.
  const [draft, setDraft] = useState(filters)
  const [seenKey, setSeenKey] = useState(() => keyOf(filters))
  const [committedKey, setCommittedKey] = useState(() => keyOf(filters))
  const filtersKey = keyOf(filters)
  if (filtersKey !== seenKey) {
    setSeenKey(filtersKey)
    // A change that didn't come from this bar, such as Back or Clear filters below the list, replaces the inputs.
    if (filtersKey !== committedKey) setDraft(filters)
  }

  function commit(next: ReviewFilters) {
    setDraft(next)
    setCommittedKey(keyOf(next))
    onChange(next)
  }

  const latest = useRef({ draft, filters, commit })
  useEffect(() => {
    latest.current = { draft, filters, commit }
  })

  // The keyword is applied once typing pauses, instead of on every keystroke.
  useEffect(() => {
    if (draft.keyword === latest.current.filters.keyword) return
    const timer = setTimeout(() => latest.current.commit(latest.current.draft), keywordDelayMs)
    return () => clearTimeout(timer)
  }, [draft.keyword])

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
          onChange={(e) => setDraft({ ...draft, keyword: e.target.value })}
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
          onChange={(e) => commit({ ...draft, sort: e.target.value as ReviewSort })}
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
          onChange={(e) => commit({ ...draft, minRating: readRating(e.target.value) })}
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
          onChange={(e) => commit({ ...draft, maxRating: readRating(e.target.value) })}
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
          onChange={(e) => commit({ ...draft, from: e.target.value })}
          slotProps={{ inputLabel: { shrink: true }, htmlInput: { max: draft.to || maxDate } }}
        />
        <TextField
          type="date"
          label="Written to"
          size="small"
          value={draft.to}
          onChange={(e) => commit({ ...draft, to: e.target.value })}
          error={Boolean(dateError)}
          helperText={dateError}
          slotProps={{ inputLabel: { shrink: true }, htmlInput: { min: draft.from || undefined, max: maxDate } }}
        />
        {hasActiveFilters(draft) && (
          <Button
            startIcon={<FilterListOffIcon />}
            onClick={() => commit({ ...emptyReviewFilters, sort: draft.sort })}
            sx={{ alignSelf: 'center' }}
          >
            Clear filters
          </Button>
        )}
      </Stack>
    </Stack>
  )
}
