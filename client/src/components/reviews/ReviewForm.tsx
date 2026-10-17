import { useId, useState, type FormEvent } from 'react'
import { Alert, Box, Button, FormControl, FormHelperText, FormLabel, Rating, Stack, TextField } from '@mui/material'
import { toFormErrors, type FormErrors } from '../../api/formErrors'
import type { Review, ReviewInput } from '../../api/reviews'
import { reviewFields, reviewTextMax, validateReview, type ReviewField } from '../../reviews/validation'

type Props = {
  // The review being edited; omitted when writing a new one.
  initial?: Review
  submitLabel: string
  onSubmit: (input: ReviewInput) => Promise<void>
  onCancel: () => void
}

export function ReviewForm({ initial, submitLabel, onSubmit, onCancel }: Props) {
  const id = useId()
  const [rating, setRating] = useState<number | null>(initial?.rating ?? null)
  const [text, setText] = useState(initial?.text ?? '')
  const [errors, setErrors] = useState<FormErrors<ReviewField>>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const nextErrors = validateReview(rating, text)
    setErrors(nextErrors)
    setFormError(null)
    if (Object.values(nextErrors).some(Boolean) || rating === null) return

    setSubmitting(true)
    try {
      const trimmed = text.trim()
      await onSubmit({ rating, text: trimmed || undefined })
    } catch (err) {
      const result = toFormErrors(err, reviewFields)
      setErrors(result.fieldErrors)
      setFormError(result.formError)
      setSubmitting(false)
    }
  }

  return (
    <Box component="form" noValidate onSubmit={handleSubmit}>
      <Stack spacing={2}>
        {formError && <Alert severity="error">{formError}</Alert>}
        <FormControl component="fieldset" error={Boolean(errors.rating)}>
          <FormLabel component="legend">Rating</FormLabel>
          <Rating
            name={`${id}-rating`}
            value={rating}
            size="large"
            onChange={(_, value) => setRating(value)}
            disabled={submitting}
          />
          {errors.rating && <FormHelperText>{errors.rating}</FormHelperText>}
        </FormControl>
        <TextField
          label="Your review (optional)"
          fullWidth
          multiline
          minRows={3}
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={submitting}
          error={Boolean(errors.text)}
          helperText={errors.text ?? `${text.length.toLocaleString()} / ${reviewTextMax.toLocaleString()} characters`}
        />
        <Stack direction="row" spacing={1} sx={{ justifyContent: 'flex-end' }}>
          <Button onClick={onCancel} disabled={submitting}>
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
