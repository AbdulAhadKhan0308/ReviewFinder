import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react'
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
import { defaultRestaurantImage } from '../restaurants/format'
import {
  imageLimits,
  restaurantFields,
  restaurantLimits,
  validateImageFile,
  validateRestaurant,
  type RestaurantField,
} from '../restaurants/validation'

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
  const [newImage, setNewImage] = useState<{ file: File; previewUrl: string } | null>(null)
  const [removeImage, setRemoveImage] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Frees the preview's in-memory copy when it's replaced or the form closes.
  useEffect(() => {
    if (!newImage) return
    return () => URL.revokeObjectURL(newImage.previewUrl)
  }, [newImage])

  const imageUrl = newImage?.previewUrl ?? (removeImage ? null : (initial?.imageUrl ?? null))
  const atCuisineLimit = cuisineIds.length >= restaurantLimits.maxCuisines

  function toggleCuisine(id: string, checked: boolean) {
    setCuisineIds((current) => (checked ? [...current, id] : current.filter((c) => c !== id)))
  }

  function handleImageChosen(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    // Clearing the input lets the same file be chosen again after removing it.
    event.target.value = ''
    if (!file) return
    const error = validateImageFile(file)
    setErrors((current) => ({ ...current, image: error }))
    if (error) return
    setNewImage({ file, previewUrl: URL.createObjectURL(file) })
    setRemoveImage(false)
  }

  function handleRemoveImage() {
    setNewImage(null)
    setRemoveImage(true)
    setErrors((current) => ({ ...current, image: undefined }))
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const input: RestaurantInput = {
      title: title.trim(),
      location: location.trim(),
      description: description.trim(),
      cuisineIds,
      removeImage,
    }
    const nextErrors = validateRestaurant(input)
    setErrors(nextErrors)
    setFormError(null)
    if (Object.values(nextErrors).some(Boolean)) return

    setSubmitting(true)
    let image: string | undefined
    try {
      image = newImage ? await readAsBase64(newImage.file) : undefined
    } catch {
      setErrors({ ...nextErrors, image: "The image couldn't be read. Choose it again." })
      setSubmitting(false)
      return
    }

    try {
      const saved = await onSubmit({ ...input, image })
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
        <FormControl component="fieldset" error={Boolean(errors.image)}>
          <FormLabel component="legend">Image</FormLabel>
          <Box
            component="img"
            src={imageUrl ?? defaultRestaurantImage}
            alt={imageUrl ? 'Restaurant image' : 'Default restaurant image'}
            sx={{
              mt: 1,
              width: '100%',
              maxWidth: 480,
              aspectRatio: '16 / 9',
              objectFit: 'cover',
              borderRadius: 1,
              bgcolor: 'grey.100',
            }}
          />
          <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
            <Button variant="outlined" onClick={() => fileInputRef.current?.click()} disabled={submitting}>
              {imageUrl ? 'Change image' : 'Choose image'}
            </Button>
            {imageUrl && (
              <Button color="error" onClick={handleRemoveImage} disabled={submitting}>
                Remove image
              </Button>
            )}
          </Stack>
          <FormHelperText>{errors.image ?? 'JPG, PNG or WebP, up to 5 MB.'}</FormHelperText>
          <input
            ref={fileInputRef}
            type="file"
            accept={imageLimits.types.join(',')}
            hidden
            onChange={handleImageChosen}
          />
        </FormControl>
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

function readAsBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      // The result looks like "data:image/png;base64,iVBOR…"; the image itself is after the comma.
      const dataUrl = String(reader.result)
      resolve(dataUrl.slice(dataUrl.indexOf(',') + 1))
    }
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}
