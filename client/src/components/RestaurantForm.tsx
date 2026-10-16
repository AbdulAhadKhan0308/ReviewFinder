import { useState, type FormEvent } from 'react'
import { Link as RouterLink, useNavigate } from 'react-router'
import {
  Alert,
  Box,
  Button,
  Checkbox,
  FormControl,
  FormControlLabel,
  FormGroup,
  FormHelperText,
  FormLabel,
  Stack,
  TextField,
} from '@mui/material'
import { toFormErrors, type FormErrors } from '../api/formErrors'
import type { Cuisine, RestaurantDetail, RestaurantInput } from '../api/restaurants'
import { restaurantFields, restaurantLimits, validateRestaurant, type RestaurantField } from '../restaurants/validation'

type Props = {
  cuisines: Cuisine[]
  // The restaurant being edited; omitted when adding a new one.
  initial?: RestaurantDetail
  submitLabel: string
  cancelTo: string
  onSubmit: (input: RestaurantInput) => Promise<RestaurantDetail>
}

export function RestaurantForm({ cuisines, initial, submitLabel, cancelTo, onSubmit }: Props) {
  const navigate = useNavigate()
  const [title, setTitle] = useState(initial?.title ?? '')
  const [location, setLocation] = useState(initial?.location ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [cuisineIds, setCuisineIds] = useState<string[]>(initial?.cuisines.map((c) => c.id) ?? [])
  const [errors, setErrors] = useState<FormErrors<RestaurantField>>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const atCuisineLimit = cuisineIds.length >= restaurantLimits.maxCuisines

  function toggleCuisine(id: string, checked: boolean) {
    setCuisineIds((current) => (checked ? [...current, id] : current.filter((c) => c !== id)))
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const input: RestaurantInput = {
      title: title.trim(),
      location: location.trim(),
      description: description.trim(),
      cuisineIds,
    }
    const nextErrors = validateRestaurant(input)
    setErrors(nextErrors)
    setFormError(null)
    if (Object.values(nextErrors).some(Boolean)) return

    setSubmitting(true)
    try {
      const saved = await onSubmit(input)
      // Replace the form in the history so Back doesn't return to a form that was already submitted.
      navigate(`/restaurants/${saved.id}`, { replace: true })
    } catch (err) {
      const result = toFormErrors(err, restaurantFields)
      setErrors(result.fieldErrors)
      setFormError(result.formError)
      setSubmitting(false)
    }
  }

  return (
    <Box component="form" noValidate onSubmit={handleSubmit}>
      <Stack spacing={2.5}>
        {formError && <Alert severity="error">{formError}</Alert>}
        <TextField
          label="Title"
          fullWidth
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          error={Boolean(errors.title)}
          helperText={errors.title}
        />
        <TextField
          label="Location"
          fullWidth
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          error={Boolean(errors.location)}
          helperText={errors.location ?? 'For example, a street address.'}
        />
        <TextField
          label="Description"
          fullWidth
          multiline
          minRows={4}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          error={Boolean(errors.description)}
          helperText={
            errors.description ??
            `${description.length.toLocaleString()} / ${restaurantLimits.description.toLocaleString()} characters`
          }
        />
        <FormControl component="fieldset" error={Boolean(errors.cuisineIds)}>
          <FormLabel component="legend">Cuisines</FormLabel>
          <FormGroup row>
            {cuisines.map((cuisine) => {
              const checked = cuisineIds.includes(cuisine.id)
              return (
                <FormControlLabel
                  key={cuisine.id}
                  label={cuisine.name}
                  control={
                    <Checkbox
                      checked={checked}
                      disabled={!checked && atCuisineLimit}
                      onChange={(e) => toggleCuisine(cuisine.id, e.target.checked)}
                    />
                  }
                />
              )
            })}
          </FormGroup>
          <FormHelperText>
            {errors.cuisineIds ?? `Choose ${restaurantLimits.minCuisines} to ${restaurantLimits.maxCuisines}.`}
          </FormHelperText>
        </FormControl>
        <Stack direction="row" spacing={2} sx={{ justifyContent: 'flex-end' }}>
          <Button component={RouterLink} to={cancelTo} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" variant="contained" loading={submitting}>
            {submitLabel}
          </Button>
        </Stack>
      </Stack>
    </Box>
  )
}
